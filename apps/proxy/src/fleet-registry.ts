import { EventEmitter } from 'node:events';
import { WebSocket, WebSocketServer } from 'ws';

export type FleetAgentState = 'Working' | 'Idle' | 'Blocked' | 'Offline';

export interface FleetAgent {
    id: string;
    name: string;
    state: FleetAgentState;
    command: string;
    task: string;
    registeredAt: string;
    lastHeartbeat: string;
}

export class FleetRegistry extends EventEmitter {
    private readonly agents = new Map<string, FleetAgent>();
    private readonly clients = new Set<WebSocket>();

    registerAgent(id: string, name: string, command: string): FleetAgent {
        const agent: FleetAgent = {
            id,
            name,
            state: 'Idle',
            command,
            task: 'Ready',
            registeredAt: new Date().toISOString(),
            lastHeartbeat: new Date().toISOString()
        };
        this.agents.set(id, agent);
        this.broadcast({ type: 'fleet_sync', fleet: this.getAll() });
        return agent;
    }

    updateAgent(id: string, update: Partial<FleetAgent>): FleetAgent | null {
        const agent = this.agents.get(id);
        if (!agent) return null;
        Object.assign(agent, update, { lastHeartbeat: new Date().toISOString() });
        this.broadcast({ type: 'agent_update', agent });
        return agent;
    }

    getAll(): FleetAgent[] {
        return Array.from(this.agents.values());
    }

    getActiveCount(): number {
        return this.getAll().filter((agent) => agent.state === 'Working').length;
    }

    getTotalCount(): number {
        return this.agents.size;
    }

    createWebSocketServer(): WebSocketServer {
        const wss = new WebSocketServer({ noServer: true });
        wss.on('connection', (ws) => {
            this.clients.add(ws);
            ws.send(JSON.stringify({ type: 'fleet_sync', fleet: this.getAll() }));
            ws.on('close', () => this.clients.delete(ws));
        });
        return wss;
    }

    private broadcast(message: unknown): void {
        const encoded = JSON.stringify(message);
        for (const client of this.clients) {
            if (client.readyState === WebSocket.OPEN) {
                client.send(encoded);
            }
        }
    }
}
