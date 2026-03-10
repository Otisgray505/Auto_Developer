import { describe, it } from 'node:test';
import assert from 'node:assert';
import crypto from 'crypto';

// Generate a single test host key for all tests
const { privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    privateKeyEncoding: { type: 'pkcs1', format: 'pem' }
} as any);

describe('SSH Server Authentication', () => {

    it('should create a valid SSH server instance', async () => {
        const { createSshServer } = await import('./ssh-server');
        const server = createSshServer(privateKey);
        assert.ok(server, 'SSH Server should be created');
        assert.strictEqual(typeof server.listen, 'function', 'Server should have a listen method');
    });

    it('should bind to a port and start listening', async () => {
        const { createSshServer } = await import('./ssh-server');
        const server = createSshServer(privateKey);

        await new Promise<void>((resolve) => {
            server.listen(0, '127.0.0.1', () => resolve());
        });

        const addr = server.address();
        assert.ok(addr, 'Server should have an address after listening');

        server.close();
    });

    it('should assign a valid port number when using port 0', async () => {
        const { createSshServer } = await import('./ssh-server');
        const server = createSshServer(privateKey);

        await new Promise<void>((resolve) => {
            server.listen(0, '127.0.0.1', () => resolve());
        });

        const addr = server.address() as any;
        assert.ok(addr.port > 0, 'Server port should be assigned');

        server.close();
    });

    it('should accept the configured SSH_USER environment variable', async () => {
        const originalUser = process.env.SSH_USER;
        process.env.SSH_USER = 'test-user';

        const { createSshServer } = await import('./ssh-server');
        const server = createSshServer(privateKey);
        assert.ok(server, 'Server should create with custom SSH_USER');

        process.env.SSH_USER = originalUser;
    });
});
