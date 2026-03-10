import test from 'node:test';
import assert from 'node:assert';
import { createSshServer } from './ssh-server';
import { Server } from 'ssh2';
import crypto from 'crypto';

function generateTestKey(): string {
    const { privateKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        privateKeyEncoding: {
            type: 'pkcs1',
            format: 'pem'
        }
    } as any);
    return privateKey;
}

test('createSshServer should return an ssh2 Server instance', () => {
    const server = createSshServer(generateTestKey());
    assert.ok(server, "Expected server to be instantiated");
    assert.ok(typeof server.listen === 'function', "Expected server.listen to be a function");
});

test('createSshServer should accept a Buffer host key', () => {
    const key = Buffer.from(generateTestKey());
    const server = createSshServer(key);
    assert.ok(server, "Expected server to be instantiated from Buffer key");
});

test('createSshServer returned server should be closeable after listen', (t, done) => {
    const server = createSshServer(generateTestKey());
    server.listen(0, '127.0.0.1', () => {
        const addr = server.address();
        assert.ok(addr, 'Server should have an address after listen');
        server.close(() => {
            done();
        });
    });
});
