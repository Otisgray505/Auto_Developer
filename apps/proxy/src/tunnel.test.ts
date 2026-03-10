import test from 'node:test';
import assert from 'node:assert';
import child_process from 'child_process';
import { EventEmitter } from 'events';
import { startTunnel } from './tunnel';

test('startTunnel should handle cloudflared startup and URLs', (t) => {
    const originalSpawn = child_process.spawn;

    t.after(() => {
        child_process.spawn = originalSpawn;
    });

    let spawnedArgs: any[] = [];

    // Create a fake child process
    class MockChildProcess extends EventEmitter {
        stderr = new EventEmitter();
        kill() { }
    }

    const mockCp = new MockChildProcess();

    // Mock spawn to return our fake process
    (child_process as any).spawn = (cmd: string, args: string[], options: any) => {
        spawnedArgs = [cmd, args, options];
        return mockCp;
    };

    // Capture logger.info output via a custom transport
    const { logger } = require('./logger');
    const winston = require('winston');
    let loggedMessage = '';
    const captureTransport = new winston.transports.Console({
        log: (info: any, cb: any) => {
            if (typeof info.message === 'string') loggedMessage += info.message;
            if (cb) cb();
        }
    });
    logger.add(captureTransport);

    startTunnel(3000);

    // Verify spawn was called correctly
    assert.strictEqual(spawnedArgs[0], 'npx');
    assert.deepStrictEqual(spawnedArgs[1], ['cloudflared', 'tunnel', '--url', 'http://localhost:3000']);
    assert.deepStrictEqual(spawnedArgs[2], { shell: true });

    // Simulate cloudflared outputting the URL
    mockCp.stderr.emit('data', Buffer.from('INF |  https://magic-tunnel.trycloudflare.com |'));

    // Verify logger captured the tunnel URL
    assert.ok(loggedMessage.includes('https://magic-tunnel.trycloudflare.com'), 'Logger should capture tunnel URL');
    assert.ok(loggedMessage.includes('Tunnel Ready!'), 'Logger should include "Tunnel Ready!" message');

    logger.remove(captureTransport);
});

test('startTunnel should handle ENOENT gracefully', (t) => {
    const originalSpawn = child_process.spawn;

    t.after(() => {
        child_process.spawn = originalSpawn;
    });

    class MockChildProcess extends EventEmitter {
        stderr = new EventEmitter();
        kill() { }
    }

    const mockCp = new MockChildProcess();
    (child_process as any).spawn = () => mockCp;

    startTunnel(3000);

    // Simulate ENOENT error
    const error = new Error('spawn ENOENT') as any;
    error.code = 'ENOENT';

    // We just emit error; since winston logs it, we don't easily assert on logger unless we mock it,
    // but ensuring it doesn't crash the process is a good basic test.
    assert.doesNotThrow(() => {
        mockCp.emit('error', error);
    });
});
