import { EventEmitter } from 'node:events';
import { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { logger } from './logger';

export type FleetAgentState = 'Working' | 'Idle' | 'Blocked' | 'Offline';

export interface FleetAgent {
    id: string;
    name: string;
    state: FleetAgentState;
    tokens: string;
    uptime: string;
    task: string;
    command: string;
    registeredAt: string;
    lastHeartbeat: string;
}

export class FleetRegistry extends EventEmitter {
    private agents: Map<string, FleetAgent> = new Map();
    private wsClients: Set<WebSocket> = new Set();

    /**
     * Register a new agent in the fleet
     */
    public registerAgent(id: string, name: string, command: string): FleetAgent {
        const agent: FleetAgent = {
            id,
            name,
            state: 'Idle',
            tokens: '0',
            uptime: '0s',
            task: 'Initializing...',
            command,
            registeredAt: new Date().toISOString(),
            lastHeartbeat: new Date().toISOString()
        };

        this.agents.set(id, agent);
        this.emit('agent_registered', agent);
        this.broadcastFleetSync();

        logger.info('Fleet: Agent registered', {
            event: 'fleet_agent_registered',
            agentId: id,
            name,
            command
        });

        return agent;
    }

    /**
     * Update an agent's state
     */
    public updateAgent(id: string, update: Partial<FleetAgent>): FleetAgent | null {
        const agent = this.agents.get(id);
        if (!agent) return null;

        Object.assign(agent, update, { lastHeartbeat: new Date().toISOString() });
        this.emit('agent_updated', agent);
        this.broadcastAgentUpdate(agent);

        return agent;
    }

    /**
     * Remove an agent from the fleet
     */
    public deregisterAgent(id: string): boolean {
        const removed = this.agents.delete(id);
        if (removed) {
            this.emit('agent_removed', id);
            this.broadcastAgentRemove(id);

            logger.info('Fleet: Agent deregistered', {
                event: 'fleet_agent_deregistered',
                agentId: id
            });
        }
        return removed;
    }

    /**
     * Get all agents as an array
     */
    public getAll(): FleetAgent[] {
        return Array.from(this.agents.values());
    }

    /**
     * Get a specific agent
     */
    public getAgent(id: string): FleetAgent | null {
        return this.agents.get(id) || null;
    }

    /**
     * Get active agent count
     */
    public getActiveCount(): number {
        return Array.from(this.agents.values()).filter(a => a.state === 'Working').length;
    }

    /**
     * Get total agent count
     */
    public getTotalCount(): number {
        return this.agents.size;
    }

    // ──── WebSocket Fleet Stream ────

    /**
     * Create and return a WebSocket server for fleet broadcasts
     */
    public createWebSocketServer(): WebSocketServer {
        const wss = new WebSocketServer({ noServer: true });

        wss.on('connection', (ws: WebSocket) => {
            this.wsClients.add(ws);

            logger.info('Fleet WS: Client connected', { event: 'fleet_ws_connect' });

            // Send initial fleet state
            ws.send(JSON.stringify({
                type: 'fleet_sync',
                fleet: this.getAll()
            }));

            ws.on('message', (raw) => {
                try {
                    const msg = JSON.parse(raw.toString());
                    if (msg.type === 'agent_action' && msg.id && msg.action) {
                        this.handleAgentAction(msg.id, msg.action);
                    }
                } catch {
                    // Ignore malformed messages
                }
            });

            ws.on('close', () => {
                this.wsClients.delete(ws);
                logger.info('Fleet WS: Client disconnected', { event: 'fleet_ws_disconnect' });
            });

            ws.on('error', (err) => {
                logger.error(`Fleet WS: Client error: ${err.message}`, { event: 'fleet_ws_error' });
            });
        });

        logger.info('[FLEET] WebSocket fleet stream ready', { event: 'fleet_ws_ready' });
        return wss;
    }

    private handleAgentAction(agentId: string, action: 'stop' | 'restart'): void {
        const agent = this.agents.get(agentId);
        if (!agent) return;

        if (action === 'stop') {
            this.updateAgent(agentId, { state: 'Idle', task: 'Stopped by operator' });
        } else if (action === 'restart') {
            this.updateAgent(agentId, { state: 'Working', task: 'Restarting...' });
        }

        logger.info('Fleet: Agent action received', {
            event: 'fleet_agent_action',
            agentId,
            action
        });
    }

    private broadcastFleetSync(): void {
        const message = JSON.stringify({
            type: 'fleet_sync',
            fleet: this.getAll()
        });
        this.broadcast(message);
    }

    private broadcastAgentUpdate(agent: FleetAgent): void {
        const message = JSON.stringify({
            type: 'agent_update',
            agent
        });
        this.broadcast(message);
    }

    private broadcastAgentRemove(id: string): void {
        const message = JSON.stringify({
            type: 'agent_remove',
            id
        });
        this.broadcast(message);
    }

    private broadcast(message: string): void {
        for (const client of this.wsClients) {
            if (client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        }
    }
}
