import express, { Request, Response } from 'express';
import { createServer } from 'http';
import cors from 'cors';
import { createProxyMiddleware, fixRequestBody, Options } from 'http-proxy-middleware';
import { z } from 'zod';
import { Worker } from './worker';
import { createSshServer } from './ssh-server';
import { createLogStream } from './ws-stream';
import { logger } from './logger';
import crypto from 'crypto';
import { WebSocket, WebSocketServer } from 'ws';
import { DelegatedSessionManager, SessionTransportFactory } from './delegated-session-manager';
import { TaskStore } from './task-store';
import { FleetRegistry } from './fleet-registry';
import { StatsCollector } from './stats-collector';

export interface AppServices {
    app: express.Express;
    taskStore: TaskStore;
    sessionManager: DelegatedSessionManager;
    fleetRegistry: FleetRegistry;
    statsCollector: StatsCollector;
}

export interface CreateAppOptions {
    createSessionTransport?: SessionTransportFactory;
}

export function createApp(options: CreateAppOptions = {}): AppServices {
    const app = express();
    const taskStore = new TaskStore();
    const sessionManager = new DelegatedSessionManager(options.createSessionTransport);
    const fleetRegistry = new FleetRegistry();
    const statsCollector = new StatsCollector(fleetRegistry, taskStore);

    app.use(cors());
    app.use(express.json({ limit: '50mb' }));

    const llmRequestSchema = z.object({
        model: z.string().min(1)
    }).passthrough();

    const WINDOW_MS = 60 * 1000;
    const ipRequests = new Map<string, { count: number; resetTime: number }>();

    const rateLimiter = (req: Request, res: Response, next: Function) => {
        const maxRequests = parseInt(process.env.PROXY_RATE_LIMIT || '50', 10);
        const ip = req.ip || '127.0.0.1';
        const now = Date.now();
        const record = ipRequests.get(ip);

        if (!record || now > record.resetTime) {
            ipRequests.set(ip, { count: 1, resetTime: now + WINDOW_MS });
            return next();
        }

        if (record.count >= maxRequests) {
            logger.warn('Circuit Breaker Triggered: Rate limit exceeded', { ip, event: 'rate_limit_exceeded' });
            statsCollector.recordBlocked();
            return res.status(429).json({
                error: {
                    message: 'Too Many Requests: Proxy circuit breaker triggered to prevent upstream provider bans.',
                    type: 'rate_limit_error',
                    code: 429
                }
            });
        }

        record.count++;
        next();
    };

    const jitterMiddleware = async (_req: Request, _res: Response, next: Function) => {
        const jitterMs = Math.floor(Math.random() * (2500 - 500 + 1)) + 500;
        logger.info(`Applying randomized jitter delay of ${jitterMs}ms`, { event: 'jitter_delay' });
        await new Promise((resolve) => setTimeout(resolve, jitterMs));
        next();
    };

    const blockedCommands = ['rm -rf', 'mkfs', 'format', 'del '];

    const governanceMiddleware = (req: Request, res: Response, next: Function) => {
        if (req.body) {
            const bodyString = JSON.stringify(req.body);

            if (blockedCommands.some((cmd) => bodyString.includes(cmd))) {
                logger.warn('Governance: Blocked destructive command', { ip: req.ip, event: 'governance_block' });
                statsCollector.recordBlocked();
                return res.status(403).json({
                    error: {
                        message: 'Forbidden: Request contains a blocked destructive command. Governance policies prohibit this action.',
                        type: 'governance_error',
                        code: 403
                    }
                });
            }

            if (bodyString.length > 256000 && Array.isArray(req.body.messages)) {
                logger.info('Governance: Pruning excessive context window', { length: bodyString.length, event: 'governance_prune' });

                if (req.body.messages.length > 3) {
                    const first = req.body.messages[0];
                    const lastTwo = req.body.messages.slice(-2);
                    req.body.messages = [
                        first,
                        { role: 'system', content: '[SYSTEM NOTE: Middle conversation history pruned to preserve token budget]' },
                        ...lastTwo
                    ];
                }
            }
        }
        next();
    };

    const payloadInterceptor = (req: Request, _res: Response, next: Function) => {
        if (req.body && Object.keys(req.body).length > 0) {
            const parsed = llmRequestSchema.safeParse(req.body);
            if (parsed.success) {
                logger.info('Outbound LLM Call', {
                    route: req.path,
                    model: parsed.data.model,
                    event: 'intercept_success'
                });
                statsCollector.recordRequest();
            } else {
                logger.warn('Unrecognized payload shape intercepted', {
                    route: req.path,
                    event: 'intercept_warning'
                });
                statsCollector.recordRequest();
            }
        }
        next();
    };

    const proxyOptions: Options = {
        target: process.env.ANTHROPIC_URL || 'https://api.anthropic.com',
        changeOrigin: true,
        pathRewrite: (path, req) => {
            const model = (req as any).body?.model || '';
            if (model.startsWith('gemini-')) {
                return path.replace(/^\/v1/, '/v1beta');
            }
            return path;
        },
        router: (req) => {
            const model = (req as any).body?.model || '';
            if (model.startsWith('gpt-') || model.startsWith('o1-') || model.startsWith('o3-')) {
                return process.env.OPENAI_URL || 'https://api.openai.com';
            }
            if (model.startsWith('gemini-')) {
                return process.env.GEMINI_URL || 'https://generativelanguage.googleapis.com';
            }
            return process.env.ANTHROPIC_URL || 'https://api.anthropic.com';
        },
        on: {
            proxyReq: (proxyReq, req) => {
                fixRequestBody(proxyReq, req);
                logger.info('Forwarding request', { host: proxyReq.host, path: proxyReq.path, event: 'proxy_forward' });
            },
            proxyRes: (proxyRes) => {
                logger.info('Received response from upstream', { statusCode: proxyRes.statusCode, event: 'proxy_response' });
            }
        }
    };

    app.use('/v1', rateLimiter, jitterMiddleware, governanceMiddleware, payloadInterceptor, createProxyMiddleware(proxyOptions) as any);

    sessionManager.on('session_exit', ({ taskId, session }) => {
        taskStore.syncSession(taskId, session);
    });
    sessionManager.on('session_updated', (session) => {
        taskStore.syncSession(session.taskId, session);
    });

    app.post('/api/tasks', (req: Request, res: Response): Response => {
        const { input } = req.body;
        if (!input || typeof input !== 'string' || !input.trim()) {
            return res.status(400).json({ error: 'Missing or empty "input" field' });
        }

        const task = taskStore.createTask(input);
        return res.status(201).json(task);
    });

    app.get('/api/tasks', (_req: Request, res: Response) => {
        res.json(taskStore.getAllTasks());
    });

    app.get('/api/tasks/:id', (req: Request, res: Response): Response => {
        const task = taskStore.getTask(String(req.params.id));
        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }
        return res.json(task);
    });

    app.post('/api/tasks/:id/dispatch', async (req: Request, res: Response): Promise<Response> => {
        const task = taskStore.getTask(String(req.params.id));
        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }

        const session = await sessionManager.createSession(task.id, task.command, task.args);
        const agentId = task.session.sessionId || task.id;
        if (!fleetRegistry.getAll().some((agent) => agent.id === agentId)) {
            fleetRegistry.registerAgent(agentId, `${task.command}-worker`, task.command);
        }
        fleetRegistry.updateAgent(agentId, { state: 'Working', task: task.input });

        return res.json(taskStore.markDispatched(task.id, session));
    });

    app.post('/api/tasks/:id/terminate', (req: Request, res: Response): Response => {
        const task = taskStore.getTask(String(req.params.id));
        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }

        sessionManager.terminateSession(task.id);
        return res.json(taskStore.failTask(task.id, 'Terminated by user'));
    });

    app.post('/api/tasks/:id/attach', (req: Request, res: Response): Response => {
        const task = taskStore.getTask(String(req.params.id));
        if (!task || !task.session.sessionId) {
            return res.status(404).json({ error: 'Attachable session not found' });
        }

        return res.json({
            taskId: task.id,
            session: task.session,
            webSocketUrl: `/ws/terminal/${task.id}`
        });
    });

    app.get('/api/fleet', (_req: Request, res: Response) => {
        res.json(fleetRegistry.getAll());
    });

    app.get('/api/stats', (_req: Request, res: Response) => {
        res.json(statsCollector.getStats());
    });

    app.post('/api/cli/run', async (req: Request, res: Response): Promise<Response | void> => {
        const { command, args } = req.body;

        const allowedCommands = process.env.NODE_ENV === 'test'
            ? ['gemini', 'codex', 'claude', 'node']
            : ['gemini', 'codex', 'claude'];

        if (!command || !allowedCommands.includes(command)) {
            return res.status(403).json({ error: `Command not allowed or missing. Allowed: ${allowedCommands.join(', ')}` });
        }

        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Transfer-Encoding', 'chunked');

        const worker = new Worker(command, args || []);
        const agentId = crypto.randomUUID();
        fleetRegistry.registerAgent(agentId, `${command}-worker`, command);

        worker.on('data', (data: string) => {
            res.write(data);
            fleetRegistry.updateAgent(agentId, { state: 'Working', task: 'Processing delegated CLI output...' });
        });

        worker.on('close', (code: number) => {
            res.end(`\n[Process exited with code ${code}]`);
            fleetRegistry.updateAgent(agentId, { state: 'Idle', task: `Completed (exit ${code})` });
        });

        const started = await worker.start();
        if (!started) {
            fleetRegistry.updateAgent(agentId, { state: 'Blocked', task: 'Failed to start' });
            res.end(`\n[Process error: Failed to start worker]`);
        }
    });

    app.get('/health', (_req, res) => {
        res.json({
            status: 'ok',
            component: 'autonomous-execution-proxy',
            fleet: {
                total: statsCollector.getStats().totalAgents,
                active: statsCollector.getStats().activeProxies
            }
        });
    });

    return { app, taskStore, sessionManager, fleetRegistry, statsCollector };
}

const defaultServices = createApp();
const app = defaultServices.app;
const PORT = Number(process.env.PORT || 8080);

if (require.main === module) {
    const httpServer = createServer(app);
    const logTransport = createLogStream(httpServer);
    logger.add(logTransport);

    const fleetWss = defaultServices.fleetRegistry.createWebSocketServer();
    const terminalWss = new WebSocketServer({ noServer: true });

    httpServer.on('upgrade', (request, socket, head) => {
        const url = request.url || '';
        if (url.startsWith('/ws/fleet')) {
            fleetWss.handleUpgrade(request, socket, head, (ws) => {
                fleetWss.emit('connection', ws, request);
            });
            return;
        }

        if (url.startsWith('/ws/terminal/')) {
            terminalWss.handleUpgrade(request, socket, head, (ws) => {
                terminalWss.emit('connection', ws, request);
            });
            return;
        }

        socket.destroy();
    });

    terminalWss.on('connection', (ws: WebSocket, request) => {
        const taskId = (request.url || '').split('/').pop();
        if (!taskId) {
            ws.send(JSON.stringify({ type: 'error', data: 'Task id missing' }));
            ws.close();
            return;
        }

        try {
            const attachment = defaultServices.sessionManager.attach(taskId, (chunk) => {
                ws.send(JSON.stringify({ type: 'output', data: chunk }));
            });

            const session = defaultServices.sessionManager.getSession(taskId);
            if (session) {
                const task = defaultServices.taskStore.syncSession(taskId, session);
                defaultServices.taskStore.getTask(task.id);
            }

            ws.on('message', (raw) => {
                const message = raw.toString();
                try {
                    const parsed = JSON.parse(message);
                    if (parsed.type === 'input' && typeof parsed.data === 'string') {
                        attachment.write(parsed.data);
                    }
                } catch {
                    attachment.write(message);
                }
            });

            ws.on('close', () => {
                attachment.detach();
                const session = defaultServices.sessionManager.getSession(taskId);
                if (session) {
                    defaultServices.taskStore.syncSession(taskId, session);
                }
            });
        } catch (error) {
            ws.send(JSON.stringify({ type: 'error', data: error instanceof Error ? error.message : 'Attach failed' }));
            ws.close();
        }
    });

    httpServer.listen(PORT, '127.0.0.1', () => {
        logger.info(`🚀 [BACKEND] Supervisor Reverse Proxy Gateway listening locally on http://127.0.0.1:${PORT}`, { event: 'server_start' });
        logger.info(`📡 [BACKEND] WebSocket log stream available at ws://127.0.0.1:${PORT}/ws/logs`, { event: 'ws_stream_ready' });
        logger.info(`🖥️  [BACKEND] Delegated terminal stream available at ws://127.0.0.1:${PORT}/ws/terminal/{taskId}`, { event: 'terminal_stream_ready' });
    });

    const SSH_PORT = Number(process.env.SSH_PORT || 2222);
    const { privateKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        privateKeyEncoding: { type: 'pkcs1', format: 'pem' }
    } as any);

    const sshServer = createSshServer(privateKey);
    sshServer.listen(SSH_PORT, '127.0.0.1', () => {
        logger.info(`🛡️  [BACKEND] Custom SSH Server Backend listening locally on 127.0.0.1:${SSH_PORT}`, { event: 'ssh_server_start' });
    });
}

export default app;
