"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSshServer = createSshServer;
const ssh2_1 = require("ssh2");
const pty = __importStar(require("node-pty"));
const logger_1 = require("./logger");
// For prototyping we allow a dummy user, or strict public-key check
const ALLOWED_USER = process.env.SSH_USER || 'admin';
function createSshServer(hostKey) {
    const server = new ssh2_1.Server({
        hostKeys: [hostKey]
    }, (client, info) => {
        logger_1.logger.info(`SSH Client connected from ${info.ip}`, { event: 'ssh_connect', ip: info.ip });
        client.on('authentication', (ctx) => {
            if (ctx.method === 'password') {
                // For this custom backend we reject passwords and prefer Keys/Zero-Trust
                // But for a mock/prototype, let's accept a dummy password if specified via ENV or just reject
                if (ctx.username === ALLOWED_USER && ctx.password === (process.env.SSH_PASSWORD || 'antigravity')) {
                    logger_1.logger.info(`SSH Password accepted for ${ctx.username}`, { event: 'ssh_auth_success' });
                    return ctx.accept();
                }
                logger_1.logger.warn(`SSH Password rejected for ${ctx.username}`, { event: 'ssh_auth_reject' });
                return ctx.reject();
            }
            else if (ctx.method === 'publickey') {
                // In a real scenario, you'd check ctx.key against authorized_keys
                logger_1.logger.info(`SSH PublicKey auth attempted for ${ctx.username}`, { event: 'ssh_auth_pubkey' });
                // We'll accept it for prototype if username matches
                if (ctx.username === ALLOWED_USER) {
                    return ctx.accept();
                }
                return ctx.reject();
            }
            else {
                return ctx.reject();
            }
        });
        client.on('ready', () => {
            logger_1.logger.info('SSH Client authenticated and ready', { event: 'ssh_ready' });
            client.on('session', (accept, reject) => {
                const session = accept();
                let ptyProcess = null;
                session.on('pty', (acceptPty, rejectPty, info) => {
                    acceptPty();
                    // Fallback to a basic shell if no explicit CLI command is defined
                    const shell = process.env.SHELL || (process.platform === 'win32' ? 'powershell.exe' : 'bash');
                    // We can spawn the Antigravity Supervisor CLI here.
                    const cmd = process.env.SUPERVISOR_CLI_CMD || shell;
                    const args = process.env.SUPERVISOR_CLI_ARGS ? process.env.SUPERVISOR_CLI_ARGS.split(' ') : [];
                    logger_1.logger.info(`Spawning PTY for SSH session: ${cmd}`, { event: 'ssh_spawn_pty' });
                    try {
                        ptyProcess = pty.spawn(cmd, args, {
                            name: info.term,
                            cols: info.cols,
                            rows: info.rows,
                            cwd: process.cwd(),
                            env: process.env
                        });
                    }
                    catch (err) {
                        logger_1.logger.error(`Failed to spawn PTY: ${err.message}`, { event: 'ssh_pty_error' });
                        if (rejectPty)
                            rejectPty();
                        return;
                    }
                });
                session.on('shell', (acceptShell, rejectShell) => {
                    if (!ptyProcess) {
                        // If they didn't request a PTY, we might still want to spawn
                        if (rejectShell)
                            rejectShell();
                        return;
                    }
                    const stream = acceptShell();
                    ptyProcess.onData((data) => {
                        stream.write(data);
                    });
                    stream.on('data', (data) => {
                        ptyProcess?.write(data.toString());
                    });
                    ptyProcess.onExit((e) => {
                        logger_1.logger.info(`PTY exited with code ${e.exitCode}`, { event: 'ssh_pty_exit' });
                        stream.exit(e.exitCode ?? 0);
                        stream.end();
                    });
                    stream.on('close', () => {
                        ptyProcess?.kill();
                    });
                });
                session.on('window-change', (acceptWindowChange, rejectWindowChange, info) => {
                    if (ptyProcess) {
                        ptyProcess.resize(info.cols, info.rows);
                    }
                    if (acceptWindowChange)
                        acceptWindowChange();
                });
            });
        });
        client.on('close', () => {
            logger_1.logger.info('SSH Client disconnected', { event: 'ssh_disconnect' });
        });
        client.on('error', (err) => {
            logger_1.logger.error(`SSH Client error: ${err.message}`, { event: 'ssh_client_error' });
        });
    });
    return server;
}
//# sourceMappingURL=ssh-server.js.map