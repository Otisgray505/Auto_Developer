import { Server as HttpServer } from 'http';
import { WebSocket } from 'ws';
import Transport from 'winston-transport';
/**
 * Custom Winston transport that broadcasts log entries to all connected WebSocket clients.
 */
export declare class WebSocketTransport extends Transport {
    private clients;
    addClient(ws: WebSocket): void;
    log(info: any, callback: () => void): void;
    get clientCount(): number;
}
/**
 * Creates and attaches a WebSocket server to the given HTTP server.
 * Returns the WebSocketTransport that should be added to Winston.
 */
export declare function createLogStream(server: HttpServer): WebSocketTransport;
//# sourceMappingURL=ws-stream.d.ts.map