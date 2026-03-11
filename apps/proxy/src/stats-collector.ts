import { logger } from './logger';
import { FleetRegistry } from './fleet-registry';
import { Orchestrator } from './orchestrator';

export interface ProxyStats {
    activeProxies: number;
    totalAgents: number;
    tokenUsage: number;
    tokenBudget: number;
    blockedCalls: number;
    totalRequests: number;
    activeTasks: number;
    completedTasks: number;
    failedTasks: number;
    uptime: number; // seconds
    sparklineData: number[];
}

export class StatsCollector {
    private blockedCalls = 0;
    private totalRequests = 0;
    private tokenUsage = 0;
    private tokenBudget = 20_000_000; // 20M tokens
    private startTime = Date.now();
    private hourlyTokenSnapshots: number[] = Array(24).fill(0);
    private snapshotIndex = 0;

    private fleet: FleetRegistry;
    private orchestrator: Orchestrator;

    constructor(fleet: FleetRegistry, orchestrator: Orchestrator) {
        this.fleet = fleet;
        this.orchestrator = orchestrator;

        // Take hourly token snapshots for sparkline
        setInterval(() => {
            this.hourlyTokenSnapshots[this.snapshotIndex % 24] = this.tokenUsage / 1_000_000;
            this.snapshotIndex++;
        }, 3600 * 1000);

        // Initial snapshot
        this.hourlyTokenSnapshots[0] = this.tokenUsage / 1_000_000;
    }

    /**
     * Record a blocked governance call
     */
    public recordBlocked(): void {
        this.blockedCalls++;
        logger.info('Stats: Blocked call recorded', { event: 'stats_blocked', total: this.blockedCalls });
    }

    /**
     * Record a proxied request
     */
    public recordRequest(estimatedTokens?: number): void {
        this.totalRequests++;
        if (estimatedTokens) {
            this.tokenUsage += estimatedTokens;
        }
    }

    /**
     * Add token usage
     */
    public addTokens(count: number): void {
        this.tokenUsage += count;
    }

    /**
     * Get current stats snapshot
     */
    public getStats(): ProxyStats {
        const allTasks = this.orchestrator.getAllTasks();
        const activeTasks = allTasks.filter(t =>
            ['pending', 'analyzing', 'planned', 'dispatching', 'running'].includes(t.status)
        );
        const completedTasks = allTasks.filter(t => t.status === 'done');
        const failedTasks = allTasks.filter(t => t.status === 'failed');

        // Generate sparkline including current value
        const sparkline = [...this.hourlyTokenSnapshots];
        sparkline[this.snapshotIndex % 24] = this.tokenUsage / 1_000_000;

        return {
            activeProxies: this.fleet.getActiveCount(),
            totalAgents: this.fleet.getTotalCount(),
            tokenUsage: Math.round(this.tokenUsage / 100_000) / 10, // In Millions, 1 decimal
            tokenBudget: this.tokenBudget / 1_000_000,
            blockedCalls: this.blockedCalls,
            totalRequests: this.totalRequests,
            activeTasks: activeTasks.length,
            completedTasks: completedTasks.length,
            failedTasks: failedTasks.length,
            uptime: Math.round((Date.now() - this.startTime) / 1000),
            sparklineData: sparkline
        };
    }
}
