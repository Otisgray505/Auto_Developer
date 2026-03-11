import test from 'node:test';
import assert from 'node:assert';
import { EventEmitter } from 'node:events';
import {
    DelegatedSessionManager,
    SessionTransport,
    SessionTransportFactory
} from './delegated-session-manager';

class FakeTransport extends EventEmitter implements SessionTransport {
    public writes: string[] = [];
    public started = false;
    public terminated = false;

    async start(): Promise<void> {
        this.started = true;
    }

    write(data: string): void {
        this.writes.push(data);
    }

    terminate(): void {
        this.terminated = true;
        this.emit('exit', 0);
    }

    emitData(data: string): void {
        this.emit('data', data);
    }
}

function createManager(factory?: SessionTransportFactory) {
    return new DelegatedSessionManager(factory || (() => new FakeTransport()));
}

test('createSession creates attachable interactive metadata and starts the transport', async () => {
    let createdTransport: FakeTransport | undefined;
    const manager = createManager((_taskId, _command, _args) => {
        createdTransport = new FakeTransport();
        return createdTransport;
    });

    const session = await manager.createSession('task-1', 'gemini', ['-p', 'hello']);

    assert.ok(createdTransport);
    assert.strictEqual(createdTransport.started, true);
    assert.strictEqual(session.taskId, 'task-1');
    assert.strictEqual(session.command, 'gemini');
    assert.strictEqual(session.transport, 'pty');
    assert.strictEqual(session.interactive, true);
    assert.strictEqual(session.attachable, true);
    assert.strictEqual(session.observers, 0);
});

test('attach sends buffered output to new observers and forwards input back to the transport', async () => {
    let createdTransport: FakeTransport | undefined;
    const manager = createManager((_taskId, _command, _args) => {
        createdTransport = new FakeTransport();
        return createdTransport;
    });

    await manager.createSession('task-2', 'codex', ['-p', 'inspect']);
    createdTransport!.emitData('first line');

    const received: string[] = [];
    const attachment = manager.attach('task-2', (chunk) => {
        received.push(chunk);
    });

    assert.deepStrictEqual(received, ['first line']);
    attachment.write('yes\n');
    assert.deepStrictEqual(createdTransport!.writes, ['yes\n']);

    attachment.detach();
    assert.strictEqual(manager.getSession('task-2')?.observers, 0);
});

test('session exit marks the session as completed and detaches observers', async () => {
    let createdTransport: FakeTransport | undefined;
    const manager = createManager((_taskId, _command, _args) => {
        createdTransport = new FakeTransport();
        return createdTransport;
    });

    const session = await manager.createSession('task-3', 'claude', ['-p', 'summarize']);
    const attachment = manager.attach('task-3', () => {});
    assert.strictEqual(manager.getSession('task-3')?.observers, 1);

    createdTransport!.emit('exit', 0);

    assert.strictEqual(manager.getSession('task-3')?.status, 'completed');
    assert.strictEqual(manager.getSession('task-3')?.observers, 0);

    attachment.detach();
    assert.strictEqual(session.status, 'completed');
});
