import { FleetRegistry } from './fleet-registry';
import { TaskStore } from './task-store';

export interface ProxyStats {
    activeProxies: number;
    totalAgents: number;
    blockedCalls: number;
    totalRequests: number;
    activeTasks: number;
    completedTasks: number;
    failedTasks: number;
    uptime: number;
}

export class StatsCollector {
    private blockedCalls = 0;
    private totalRequests = 0;
    private readonly startTime = Date.now();
    private readonly fleet: FleetRegistry;
    private readonly tasks: TaskStore;

    constructor(fleet: FleetRegistry, tasks: TaskStore) {
        this.fleet = fleet;
        this.tasks = tasks;
    }

    recordBlocked(): void {
        this.blockedCalls++;
    }

    recordRequest(): void {
        this.totalRequests++;
    }

    getStats(): ProxyStats {
        const allTasks = this.tasks.getAllTasks();
        return {
            activeProxies: this.fleet.getActiveCount(),
            totalAgents: this.fleet.getTotalCount(),
            blockedCalls: this.blockedCalls,
            totalRequests: this.totalRequests,
            activeTasks: allTasks.filter((task) => task.status === 'pending' || task.status === 'running').length,
            completedTasks: allTasks.filter((task) => task.status === 'done').length,
            failedTasks: allTasks.filter((task) => task.status === 'failed').length,
            uptime: Math.round((Date.now() - this.startTime) / 1000)
        };
    }
}
