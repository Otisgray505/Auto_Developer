import winston from 'winston';
/**
 * Shared Winston logger factory for the Autonomous CLI Orchestration Gateway.
 *
 * All modules MUST import `logger` from this file instead of creating
 * their own `winston.createLogger()` instance. This ensures:
 *
 * 1. A single logger instance shared across the entire proxy
 * 2. The WebSocket transport (added at startup) broadcasts ALL logs
 * 3. Consistent format (timestamp + JSON) everywhere
 *
 * To add transports at runtime (e.g. WebSocketTransport), use `logger.add(transport)`.
 */
export declare const logger: winston.Logger;
//# sourceMappingURL=logger.d.ts.map