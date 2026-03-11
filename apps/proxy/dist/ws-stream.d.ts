import { WebSocketServer, WebSocket } from 'ws';
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
 * Creates and returns a WebSocket server and the transport that should be added to Winston.
 */
export declare function createLogStream(): {
    transport: WebSocketTransport;
    wss: WebSocketServer;
};
//# sourceMappingURL=ws-stream.d.ts.map