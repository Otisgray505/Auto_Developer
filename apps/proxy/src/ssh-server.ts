import { Server, ClientInfo, AuthContext, Session } from 'ssh2';
import * as pty from 'node-pty';
import { logger } from './logger';

// For prototyping we allow a dummy user, or strict public-key check
const ALLOWED_USER = process.env.SSH_USER || 'admin';

export function createSshServer(hostKey: string | Buffer): Server {
    const server = new Server({
        hostKeys: [hostKey]
    }, (client: any, info: ClientInfo) => {
        logger.info(`SSH Client connected from ${info.ip}`, { event: 'ssh_connect', ip: info.ip });

        client.on('authentication', (ctx: AuthContext) => {
            if (ctx.method === 'password') {
                // For this custom backend we reject passwords and prefer Keys/Zero-Trust
                // But for a mock/prototype, let's accept a dummy password if specified via ENV or just reject
                if (ctx.username === ALLOWED_USER && ctx.password === (process.env.SSH_PASSWORD || 'antigravity')) {
                    logger.info(`SSH Password accepted for ${ctx.username}`, { event: 'ssh_auth_success' });
                    return ctx.accept();
                }
                logger.warn(`SSH Password rejected for ${ctx.username}`, { event: 'ssh_auth_reject' });
                return ctx.reject();
            } else if (ctx.method === 'publickey') {
                // In a real scenario, you'd check ctx.key against authorized_keys
                logger.info(`SSH PublicKey auth attempted for ${ctx.username}`, { event: 'ssh_auth_pubkey' });
                // We'll accept it for prototype if username matches
                if (ctx.username === ALLOWED_USER) {
                    return ctx.accept();
                }
                return ctx.reject();
            } else {
                return ctx.reject();
            }
        });

        client.on('ready', () => {
            logger.info('SSH Client authenticated and ready', { event: 'ssh_ready' });

            client.on('session', (accept: any, reject: any) => {
                const session: Session = accept();
                let ptyProcess: pty.IPty | null = null;

                session.on('pty', (acceptPty: any, rejectPty: any, info: any) => {
                    acceptPty();

                    // Fallback to a basic shell if no explicit CLI command is defined
                    const shell = process.env.SHELL || (process.platform === 'win32' ? 'powershell.exe' : 'bash');

                    // We can spawn the Antigravity Supervisor CLI here.
                    const cmd = process.env.SUPERVISOR_CLI_CMD || shell;
                    const args = process.env.SUPERVISOR_CLI_ARGS ? process.env.SUPERVISOR_CLI_ARGS.split(' ') : [];

                    logger.info(`Spawning PTY for SSH session: ${cmd}`, { event: 'ssh_spawn_pty' });

                    try {
                        ptyProcess = pty.spawn(cmd, args, {
                            name: info.term,
                            cols: info.cols,
                            rows: info.rows,
                            cwd: process.cwd(),
                            env: process.env as any
                        });
                    } catch (err: any) {
                        logger.error(`Failed to spawn PTY: ${err.message}`, { event: 'ssh_pty_error' });
                        if (rejectPty) rejectPty();
                        return;
                    }
                });

                session.on('shell', (acceptShell: any, rejectShell: any) => {
                    if (!ptyProcess) {
                        // If they didn't request a PTY, we might still want to spawn
                        if (rejectShell) rejectShell();
                        return;
                    }
                    const stream = acceptShell();

                    ptyProcess.onData((data: string) => {
                        stream.write(data);
                    });

                    stream.on('data', (data: Buffer) => {
                        ptyProcess?.write(data.toString());
                    });

                    ptyProcess.onExit((e) => {
                        logger.info(`PTY exited with code ${e.exitCode}`, { event: 'ssh_pty_exit' });
                        stream.exit(e.exitCode ?? 0);
                        stream.end();
                    });

                    stream.on('close', () => {
                        ptyProcess?.kill();
                    });
                });

                session.on('window-change', (acceptWindowChange: any, rejectWindowChange: any, info: any) => {
                    if (ptyProcess) {
                        ptyProcess.resize(info.cols, info.rows);
                    }
                    if (acceptWindowChange) acceptWindowChange();
                });
            });
        });

        client.on('close', () => {
            logger.info('SSH Client disconnected', { event: 'ssh_disconnect' });
        });

        client.on('error', (err: any) => {
            logger.error(`SSH Client error: ${err.message}`, { event: 'ssh_client_error' });
        });
    });

    return server;
}
