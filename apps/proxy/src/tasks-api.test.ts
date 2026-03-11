import test, { afterEach, beforeEach } from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import { EventEmitter } from 'node:events';
import { createApp } from './index';
import { SessionTransport } from './delegated-session-manager';

class FakeTransport extends EventEmitter implements SessionTransport {
    public writes: string[] = [];

    async start(): Promise<void> {
        return;
    }

    write(data: string): void {
        this.writes.push(data);
    }

    terminate(): void {
        this.emit('exit', 0);
    }

    emitData(data: string): void {
        this.emit('data', data);
    }
}

let server: http.Server;
let fakeTransport: FakeTransport;

beforeEach(async () => {
    fakeTransport = new FakeTransport();
    const { app } = createApp({
        createSessionTransport: () => fakeTransport
    });

    server = app.listen(0, '127.0.0.1');
    await new Promise<void>((resolve) => server.on('listening', resolve));
});

afterEach(() => {
    server.close();
});

test('POST /api/tasks creates a pending task with unattached session metadata', async () => {
    const port = (server.address() as any).port;
    const response = await fetch(`http://127.0.0.1:${port}/api/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: 'Use codex to refactor the proxy logging' })
    });

    assert.strictEqual(response.status, 201);
    const body = await response.json();
    assert.strictEqual(body.status, 'pending');
    assert.strictEqual(body.command, 'codex');
    assert.deepStrictEqual(body.session, {
        sessionId: null,
        transport: null,
        interactive: false,
        attachable: false,
        observers: 0,
        status: 'idle'
    });
});

test('POST /api/tasks/:id/dispatch creates an attachable running session', async () => {
    const port = (server.address() as any).port;
    const created = await fetch(`http://127.0.0.1:${port}/api/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: 'Use gemini to review the task queue' })
    });
    const task = await created.json();

    const dispatched = await fetch(`http://127.0.0.1:${port}/api/tasks/${task.id}/dispatch`, {
        method: 'POST'
    });

    assert.strictEqual(dispatched.status, 200);
    const body = await dispatched.json();
    assert.strictEqual(body.status, 'running');
    assert.ok(body.session.sessionId);
    assert.strictEqual(body.session.transport, 'pty');
    assert.strictEqual(body.session.interactive, true);
    assert.strictEqual(body.session.attachable, true);
    assert.strictEqual(body.session.status, 'running');
});
