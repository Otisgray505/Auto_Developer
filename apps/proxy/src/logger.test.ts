import { describe, it } from 'node:test';
import assert from 'node:assert';
import { logger } from './logger';

describe('Shared Logger (src/logger.ts)', () => {

    it('should export a singleton logger instance', () => {
        assert.ok(logger, 'Logger should be defined');
        assert.strictEqual(typeof logger.info, 'function', 'Logger should have info method');
        assert.strictEqual(typeof logger.warn, 'function', 'Logger should have warn method');
        assert.strictEqual(typeof logger.error, 'function', 'Logger should have error method');
    });

    it('should have the default log level set to info', () => {
        assert.strictEqual(logger.level, process.env.LOG_LEVEL || 'info', 'Logger level should match LOG_LEVEL env or default to info');
    });

    it('should support adding and removing transports at runtime', () => {
        const initialCount = logger.transports.length;
        assert.ok(initialCount >= 1, 'Logger should have at least the Console transport');

        // Create a minimal transport to test add/remove
        const winston = require('winston');
        const tempTransport = new winston.transports.Console({ silent: true });
        logger.add(tempTransport);
        assert.strictEqual(logger.transports.length, initialCount + 1, 'Transport count should increase after add');

        logger.remove(tempTransport);
        assert.strictEqual(logger.transports.length, initialCount, 'Transport count should restore after remove');
    });

    it('should emit logs without throwing', () => {
        assert.doesNotThrow(() => {
            logger.info('Test info message', { event: 'test_info' });
            logger.warn('Test warn message', { event: 'test_warn' });
            logger.error('Test error message', { event: 'test_error' });
        }, 'Logger should emit logs without throwing');
    });
});
