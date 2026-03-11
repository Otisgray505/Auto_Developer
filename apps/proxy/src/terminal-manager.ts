import * as pty from 'node-pty';
import * as os from 'os';
import * as path from 'path';
import { EventEmitter } from 'events';
import { logger } from './logger';

export class TerminalSession extends EventEmitter {
    public id: string;
    private ptyProcess?: pty.IPty;
    private outputBuffer: string = '';

    constructor(taskId: string, command: string, args: string[] = []) {
        super();
        this.id = taskId;
        
        const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';
        const fullArgs = os.platform() === 'win32' ? ['-NoLogo', '-NoProfile', '-Command', `${command} ${args.map(a => `"${a.replace(/"/g, '`"')}"`).join(' ')}`] : ['-c', `${command} ${args.join(' ')}`];
        
        logger.info(`Starting interactive PTY terminal for task ${taskId}`, { event: 'pty_start', command, args });
        const workspaceRoot = process.env.WORKSPACE_ROOT || path.resolve(process.cwd(), '../..');
        try {
            this.ptyProcess = pty.spawn(shell, fullArgs, {
                name: 'xterm-color',
                cols: 100,
                rows: 30,
                cwd: workspaceRoot,
                env: {
                    ...process.env,
                    GEMINI_API_BASE_URL: 'http://127.0.0.1:8080/v1',
                    WORKSPACE_ROOT: workspaceRoot
                } as any
            });

            this.ptyProcess.onData((data) => {
                this.outputBuffer += data;
                // keep buffer from growing infinitely
                if (this.outputBuffer.length > 50000) {
                    this.outputBuffer = this.outputBuffer.substring(this.outputBuffer.length - 50000);
                }
                this.emit('data', data);
            });

            this.ptyProcess.onExit(({ exitCode, signal }) => {
                logger.info(`Interactive PTY terminal exited for task ${taskId}`, { event: 'pty_exit', exitCode });
                this.emit('exit', exitCode);
            });
        } catch (err: any) {
            logger.error(`Failed to spawn interactive PTY: ${err.message}`, { event: 'pty_error' });
            this.emit('exit', 1);
        }
    }

    public write(data: string) {
        if (this.ptyProcess) {
            this.ptyProcess.write(data);
        }
    }

    public getBuffer() {
        return this.outputBuffer;
    }

    public terminate() {
        if (this.ptyProcess) {
            try {
                this.ptyProcess.kill();
            } catch (err) {
                // ignore
            }
        }
    }
}

export class TerminalManager {
    private sessions: Map<string, TerminalSession> = new Map();

    public createSession(taskId: string, command: string, args: string[]): TerminalSession {
        this.terminateSession(taskId); // Ensure no old session
        const session = new TerminalSession(taskId, command, args);
        this.sessions.set(taskId, session);
        
        session.on('exit', () => {
            this.sessions.delete(taskId);
        });
        
        return session;
    }

    public getSession(taskId: string): TerminalSession | undefined {
        return this.sessions.get(taskId);
    }

    public terminateSession(taskId: string) {
        const session = this.sessions.get(taskId);
        if (session) {
            session.terminate();
            this.sessions.delete(taskId);
        }
    }
}
