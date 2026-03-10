import { EventEmitter } from 'node:events';
export type WorkerState = 'stopped' | 'running' | 'idle' | 'blocked' | 'crashed';
export declare class Worker extends EventEmitter {
    private command;
    private args;
    private process?;
    private connection?;
    private state;
    private sessionId?;
    constructor(command: string, args?: string[]);
    start(): Promise<boolean>;
    stop(): boolean;
    getState(): WorkerState;
}
//# sourceMappingURL=worker.d.ts.map