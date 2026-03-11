import crypto from 'node:crypto';
import { EventEmitter } from 'node:events';
import * as os from 'node:os';
import * as path from 'node:path';
import * as pty from 'node-pty';
import { logger } from './logger';

export type SessionStatus = 'idle' | 'running' | 'completed' | 'failed';

export interface SessionTransport extends EventEmitter {
    start(): Promise<void> | void;
    write(data: string): void;
    terminate(): void;
}

export type SessionTransportFactory = (taskId: string, command: string, args: string[]) => SessionTransport;

export interface DelegatedSession {
    sessionId: string;
    taskId: string;
    command: string;
    args: string[];
    transport: 'pty';
    interactive: boolean;
    attachable: boolean;
    observers: number;
    status: SessionStatus;
    outputBuffer: string;
    exitCode?: number;
}

export interface SessionAttachment {
    write(data: string): void;
    detach(): void;
}

export class PtySessionTransport extends EventEmitter implements SessionTransport {
    private ptyProcess?: pty.IPty;
    private readonly taskId: string;
    private readonly command: string;
    private readonly args: string[];

    constructor(taskId: string, command: string, args: string[]) {
        super();
        this.taskId = taskId;
        this.command = command;
        this.args = args;
    }

    async start(): Promise<void> {
        const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';
        const fullArgs = os.platform() === 'win32'
            ? ['-NoLogo', '-NoProfile', '-Command', `${this.command} ${this.args.map(escapePowerShellArg).join(' ')}`]
            : ['-lc', `${this.command} ${this.args.map(escapeShellArg).join(' ')}`];
        const workspaceRoot = process.env.WORKSPACE_ROOT || path.resolve(process.cwd(), '../..');

        logger.info('Starting delegated PTY session', {
            event: 'delegated_session_start',
            taskId: this.taskId,
            command: this.command
        });

        this.ptyProcess = pty.spawn(shell, fullArgs, {
            name: 'xterm-color',
            cols: 120,
            rows: 36,
            cwd: workspaceRoot,
            env: {
                ...process.env,
                GEMINI_API_BASE_URL: process.env.GEMINI_API_BASE_URL || 'http://127.0.0.1:8080/v1',
                OPENAI_API_BASE: process.env.OPENAI_API_BASE || 'http://127.0.0.1:8080/v1',
                ANTHROPIC_BASE_URL: process.env.ANTHROPIC_BASE_URL || 'http://127.0.0.1:8080/v1',
                WORKSPACE_ROOT: workspaceRoot
            } as NodeJS.ProcessEnv
        });

        this.ptyProcess.onData((data) => {
            this.emit('data', data);
        });

        this.ptyProcess.onExit(({ exitCode }) => {
            this.emit('exit', exitCode);
        });
    }

    write(data: string): void {
        this.ptyProcess?.write(data);
    }

    terminate(): void {
        this.ptyProcess?.kill();
    }
}

export class DelegatedSessionManager extends EventEmitter {
    private readonly sessions = new Map<string, DelegatedSession>();
    private readonly transportFactory: SessionTransportFactory;
    private readonly transports = new Map<string, SessionTransport>();
    private readonly observers = new Map<string, Set<(chunk: string) => void>>();

    constructor(transportFactory: SessionTransportFactory = (taskId, command, args) => new PtySessionTransport(taskId, command, args)) {
        super();
        this.transportFactory = transportFactory;
    }

    async createSession(taskId: string, command: string, args: string[]): Promise<DelegatedSession> {
        this.terminateSession(taskId);

        const session: DelegatedSession = {
            sessionId: crypto.randomUUID(),
            taskId,
            command,
            args: [...args],
            transport: 'pty',
            interactive: true,
            attachable: true,
            observers: 0,
            status: 'running',
            outputBuffer: ''
        };

        const transport = this.transportFactory(taskId, command, args);
        this.sessions.set(taskId, session);
        this.transports.set(taskId, transport);
        this.observers.set(taskId, new Set());

        transport.on('data', (chunk: string) => {
            session.outputBuffer = trimBuffer(session.outputBuffer + chunk);
            this.emitToObservers(taskId, chunk);
        });

        transport.on('exit', (code: number) => {
            session.status = code === 0 ? 'completed' : 'failed';
            session.exitCode = code;
            session.observers = 0;
            this.observers.delete(taskId);
            this.transports.delete(taskId);
            this.emit('session_updated', session);
            this.emit('session_exit', { taskId, code, session });
        });

        await transport.start();
        this.emit('session_created', session);
        return session;
    }

    attach(taskId: string, onData: (chunk: string) => void): SessionAttachment {
        const session = this.sessions.get(taskId);
        const listeners = this.observers.get(taskId);
        const transport = this.transports.get(taskId);

        if (!session || !listeners || !transport) {
            throw new Error(`Delegated session not found for task ${taskId}`);
        }

        listeners.add(onData);
        session.observers = listeners.size;
        this.emit('session_updated', session);

        if (session.outputBuffer) {
            onData(session.outputBuffer);
        }

        return {
            write: (data: string) => transport.write(data),
            detach: () => {
                if (listeners.delete(onData)) {
                    session.observers = listeners.size;
                    this.emit('session_updated', session);
                }
            }
        };
    }

    getSession(taskId: string): DelegatedSession | undefined {
        return this.sessions.get(taskId);
    }

    terminateSession(taskId: string): void {
        const transport = this.transports.get(taskId);
        if (transport) {
            transport.terminate();
            this.transports.delete(taskId);
        }
    }

    private emitToObservers(taskId: string, chunk: string): void {
        const listeners = this.observers.get(taskId);
        if (!listeners) return;

        for (const listener of listeners) {
            listener(chunk);
        }
    }
}

function trimBuffer(buffer: string): string {
    const maxLength = 50_000;
    if (buffer.length <= maxLength) {
        return buffer;
    }

    return buffer.slice(buffer.length - maxLength);
}

function escapePowerShellArg(value: string): string {
    return `"${value.replace(/"/g, '`"')}"`;
}

function escapeShellArg(value: string): string {
    return `'${value.replace(/'/g, `'\\''`)}'`;
}
