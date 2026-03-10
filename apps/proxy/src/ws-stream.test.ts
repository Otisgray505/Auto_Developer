import test from 'node:test';
import assert from 'node:assert';
import { createServer } from 'http';
import { WebSocketTransport, createLogStream } from './ws-stream';

test('WebSocketTransport should track client count', () => {
    const transport = new WebSocketTransport();
    assert.strictEqual(transport.clientCount, 0, 'Initial client count should be 0');
});

test('WebSocketTransport.log should call callback', (t, done) => {
    const transport = new WebSocketTransport();
    transport.log({ level: 'info', message: 'test' }, () => {
        done();
    });
});

test('createLogStream should return a WebSocketTransport', () => {
    const httpServer = createServer();
    const transport = createLogStream(httpServer);
    assert.ok(transport instanceof WebSocketTransport, 'Expected WebSocketTransport instance');
    httpServer.close();
});
