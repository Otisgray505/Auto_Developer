import { spawn, ChildProcess } from 'node:child_process';
import { EventEmitter } from 'node:events';
import * as os from 'node:os';
import { Writable, Readable } from 'node:stream';
import * as acp from '@agentclientprotocol/sdk';
import { AcpGovernanceHandlers } from './acp-handlers';
import { logger } from './logger';

export type WorkerState = 'stopped' | 'running' | 'idle' | 'blocked' | 'crashed';

export class Worker extends EventEmitter {
    private command: string;
    private args: string[];
    private process?: ChildProcess;
    private connection?: acp.ClientSideConnection;
    private state: WorkerState = 'stopped';
    private sessionId?: string;

    constructor(command: string, args: string[] = []) {
        super();
        this.command = command;
        this.args = args;
    }

    public async start(): Promise<boolean> {
        try {
            const isWindows = os.platform() === 'win32';

            this.process = spawn(this.command, this.args, {
                cwd: process.cwd(),
                env: process.env as any,
                shell: isWindows,
                stdio: ['pipe', 'pipe', 'inherit']
            });

            this.state = 'running';

            this.process.on('exit', (code) => {
                if (code !== 0 && this.state !== 'stopped') {
                    this.state = 'crashed';
                } else {
                    this.state = 'stopped';
                }
                this.emit('close', code ?? 0);
            });

            // Initialize ACP Client Connection
            const input = Writable.toWeb(this.process.stdin!) as unknown as WritableStream<Uint8Array>;
            const output = Readable.toWeb(this.process.stdout!) as unknown as ReadableStream<Uint8Array>;

            const stream = acp.ndJsonStream(input, output);

            const handlers = new AcpGovernanceHandlers(
                (data) => this.emit('data', data),
                (newState) => { this.state = newState; }
            );

            this.connection = new acp.ClientSideConnection((_agent) => handlers, stream);

            // Establish the connection and negotiate capabilities
            const initResult = await this.connection.initialize({
                protocolVersion: acp.PROTOCOL_VERSION,
                clientCapabilities: {
                    fs: { readTextFile: true, writeTextFile: true }
                }
            });

            this.emit('data', `[ACP] Connected to agent (protocol v${initResult.protocolVersion})\n`);

            // Optionally create a new session
            const sessionResult = await this.connection.newSession({
                cwd: process.cwd(),
                mcpServers: []
            });
            this.sessionId = sessionResult.sessionId;
            this.state = 'idle';

            return true;
        } catch (err) {
            logger.error('Failed to spawn ACP worker', { error: String(err), event: 'acp_spawn_error' });
            this.state = 'crashed';
            return false;
        }
    }

    public stop(): boolean {
        if (!this.process) return false;

        try {
            this.state = 'stopped';
            this.process.kill('SIGTERM');
            return true;
        } catch (err) {
            // fallback
            this.process.kill('SIGKILL');
            return false;
        }
    }

    public getState(): WorkerState {
        return this.state;
    }
}
