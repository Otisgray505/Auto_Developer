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
export const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.Console()
    ]
});
