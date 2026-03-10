import { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import Transport from 'winston-transport';
import { logger } from './logger';

/**
 * Custom Winston transport that broadcasts log entries to all connected WebSocket clients.
 */
export class WebSocketTransport extends Transport {
    private clients: Set<WebSocket> = new Set();

    addClient(ws: WebSocket): void {
        this.clients.add(ws);
        ws.on('close', () => this.clients.delete(ws));
    }

    log(info: any, callback: () => void): void {
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
            if (client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        }

        callback();
    }

    get clientCount(): number {
        return this.clients.size;
    }
}

/**
 * Creates and attaches a WebSocket server to the given HTTP server.
 * Returns the WebSocketTransport that should be added to Winston.
 */
export function createLogStream(server: HttpServer): WebSocketTransport {
    const wss = new WebSocketServer({ server, path: '/ws/logs' });
    const transport = new WebSocketTransport();

    wss.on('connection', (ws: WebSocket) => {
        logger.info('Dashboard WebSocket client connected', { event: 'ws_connect' });
        transport.addClient(ws);

        ws.send(JSON.stringify({
            level: 'info',
            event: 'ws_welcome',
            message: 'Connected to Supervisor log stream',
            timestamp: new Date().toISOString()
        }));

        ws.on('error', (err) => {
            logger.error(`WebSocket client error: ${err.message}`, { event: 'ws_error' });
        });
    });

    return transport;
}
