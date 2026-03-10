"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const winston_1 = __importDefault(require("winston"));
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
exports.logger = winston_1.default.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.json()),
    transports: [
        new winston_1.default.transports.Console()
    ]
});
//# sourceMappingURL=logger.js.map