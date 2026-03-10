import { describe, it } from 'node:test';
import assert from 'node:assert';
import { createServer } from 'http';
import { WebSocket } from 'ws';
import { WebSocketTransport, createLogStream } from './ws-stream';

describe('WebSocket Log Stream — Integration', () => {

    it('should send welcome message to newly connected clients', async () => {
        const httpServer = createServer();
        const transport = createLogStream(httpServer);

        await new Promise<void>(resolve => httpServer.listen(0, '127.0.0.1', resolve));
        const port = (httpServer.address() as any).port;

        const ws = new WebSocket(`ws://127.0.0.1:${port}/ws/logs`);

        const welcomeMsg = await new Promise<any>((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Timed out waiting for welcome')), 3000);
            ws.on('message', (data) => {
                clearTimeout(timeout);
                resolve(JSON.parse(data.toString()));
            });
            ws.on('error', reject);
        });

        assert.strictEqual(welcomeMsg.event, 'ws_welcome', 'First message should be the welcome event');
        assert.strictEqual(welcomeMsg.level, 'info', 'Welcome should be info level');
        assert.ok(welcomeMsg.message.includes('Connected'), 'Welcome message should mention connection');

        ws.close();
        httpServer.close();
    });

    it('should broadcast Winston log entries to connected clients', async () => {
        const httpServer = createServer();
        const transport = createLogStream(httpServer);

        await new Promise<void>(resolve => httpServer.listen(0, '127.0.0.1', resolve));
        const port = (httpServer.address() as any).port;

        const ws = new WebSocket(`ws://127.0.0.1:${port}/ws/logs`);

        // Wait for welcome, then skip it
        await new Promise<void>((resolve) => {
            ws.on('message', () => resolve());
        });

        // Now send a log entry through the transport and capture it
        const logPromise = new Promise<any>((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Timed out waiting for log')), 3000);
            ws.on('message', (data) => {
                clearTimeout(timeout);
                resolve(JSON.parse(data.toString()));
            });
        });

        // Emit a log through the transport
        transport.log(
            { level: 'warn', message: 'Test broadcast message', event: 'test_event', timestamp: new Date().toISOString() },
            () => { }
        );

        const received = await logPromise;
        assert.strictEqual(received.level, 'warn', 'Received log level should match');
        assert.strictEqual(received.message, 'Test broadcast message', 'Received message should match');
        assert.strictEqual(received.event, 'test_event', 'Received event should match');

        ws.close();
        httpServer.close();
    });

    it('should track and clean up disconnected clients', async () => {
        const httpServer = createServer();
        const transport = createLogStream(httpServer);

        await new Promise<void>(resolve => httpServer.listen(0, '127.0.0.1', resolve));
        const port = (httpServer.address() as any).port;

        const ws = new WebSocket(`ws://127.0.0.1:${port}/ws/logs`);
        await new Promise<void>(resolve => ws.on('open', resolve));

        assert.strictEqual(transport.clientCount, 1, 'Should have 1 connected client');

        // Close the client and wait for cleanup
        ws.close();
        await new Promise(resolve => setTimeout(resolve, 200));

        assert.strictEqual(transport.clientCount, 0, 'Should have 0 clients after disconnect');

        httpServer.close();
    });
});
