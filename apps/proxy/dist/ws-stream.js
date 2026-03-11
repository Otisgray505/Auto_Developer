"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebSocketTransport = void 0;
exports.createLogStream = createLogStream;
const ws_1 = require("ws");
const winston_transport_1 = __importDefault(require("winston-transport"));
const logger_1 = require("./logger");
/**
 * Custom Winston transport that broadcasts log entries to all connected WebSocket clients.
 */
class WebSocketTransport extends winston_transport_1.default {
    clients = new Set();
    addClient(ws) {
        this.clients.add(ws);
        ws.on('close', () => this.clients.delete(ws));
    }
    log(info, callback) {
        setImmediate(() => this.emit('logged', info));
        const message = JSON.stringify({
            level: info.level,
            message: info.message,
            event: info.event || 'log',
            timestamp: info.timestamp || new Date().toISOString(),
            ...(info.route ? { route: info.route } : {}),
            ...(info.statusCode ? { statusCode: info.statusCode } : {})
        });
        for (const client of this.clients) {
            if (client.readyState === ws_1.WebSocket.OPEN) {
                client.send(message);
            }
        }
        callback();
    }
    get clientCount() {
        return this.clients.size;
    }
}
exports.WebSocketTransport = WebSocketTransport;
/**
 * Creates and returns a WebSocket server and the transport that should be added to Winston.
 */
function createLogStream() {
    const wss = new ws_1.WebSocketServer({ noServer: true });
    const transport = new WebSocketTransport();
    wss.on('connection', (ws) => {
        logger_1.logger.info('Dashboard WebSocket client connected', { event: 'ws_connect' });
        transport.addClient(ws);
        ws.send(JSON.stringify({
            level: 'info',
            event: 'ws_welcome',
            message: 'Connected to Supervisor log stream',
            timestamp: new Date().toISOString()
        }));
        ws.on('error', (err) => {
            logger_1.logger.error(`WebSocket client error: ${err.message}`, { event: 'ws_error' });
        });
    });
    return { transport, wss };
}
//# sourceMappingURL=ws-stream.js.map