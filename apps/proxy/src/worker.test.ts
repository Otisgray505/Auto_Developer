import { describe, it } from 'node:test';
import assert from 'node:assert';
import { join } from 'node:path';
import { Worker } from './worker';

describe('ACP Execution Engine (Worker)', () => {
    const dummyAgentPath = join(__dirname, 'dummy-agent.js');

    it('should initialize an ACP worker and negotiate capabilities successfully', async () => {
        const worker = new Worker('node', [dummyAgentPath]);
        assert.ok(worker, 'Worker instance should be created');

        const started = await worker.start();
        assert.strictEqual(started, true, 'Worker should start and negotiate ACP capabilities');
        assert.strictEqual(worker.getState(), 'idle', 'Worker state should reach idle after session created');

        worker.stop();
    });

    it('should emit ACP JSON-RPC connection events cleanly', async () => {
        const worker = new Worker('node', [dummyAgentPath]);

        let emittedData = false;
        worker.on('data', (data) => {
            if (data.includes('[ACP] Connected to agent')) {
                emittedData = true;
            }
        });

        const started = await worker.start();
        assert.strictEqual(started, true, 'Worker should start');

        assert.strictEqual(emittedData, true, 'Worker should emit connection completion data event');

        worker.stop();
    });

    it('should propagate SIGTERM and stop gracefully', async () => {
        const worker = new Worker('node', [dummyAgentPath]);
        await worker.start();

        const stopped = worker.stop();
        assert.strictEqual(stopped, true, 'Worker should stop successfully');
        assert.strictEqual(worker.getState(), 'stopped', 'Worker state should transition to stopped');
    });
});
