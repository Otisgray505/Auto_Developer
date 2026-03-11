import express, { Request, Response } from 'express';
import { createServer } from 'http';
import cors from 'cors';
import { createProxyMiddleware, fixRequestBody, Options } from 'http-proxy-middleware';
import { z } from 'zod';
import { Worker } from './worker';
import { createSshServer } from './ssh-server';
import { createLogStream } from './ws-stream';
import { Orchestrator } from './orchestrator';
import { FleetRegistry } from './fleet-registry';
import { StatsCollector } from './stats-collector';
import { TerminalManager } from './terminal-manager';
import { logger } from './logger';
import crypto from 'crypto';
import { WebSocketServer, WebSocket } from 'ws';

// Autonomous CLI Orchestration Gateway - Local Proxy
const app = express();
const PORT = Number(process.env.PORT || 8080);

// ──── Core Services ────
const orchestrator = new Orchestrator();
const fleetRegistry = new FleetRegistry();
const statsCollector = new StatsCollector(fleetRegistry, orchestrator);
const terminalManager = new TerminalManager();

// Track active workers by task ID
const activeWorkers = new Map<string, Worker>();

app.use(cors()); // Note: In production, explicitly set origins rather than globally enabling CORS.

// Parse JSON bodies so we can inspect the payload (required for intercepting model name)
app.use(express.json({ limit: '50mb' }));

// Zod schema for validating standard LLM proxy requests
const llmRequestSchema = z.object({
    model: z.string().min(1)
}).passthrough();

// Simple in-memory rate limiter (Circuit Breaker)
const WINDOW_MS = 60 * 1000; // 1 minute
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

// Jitter Middleware to simulate human "think time"
const jitterMiddleware = async (req: Request, res: Response, next: Function) => {
    const jitterMs = Math.floor(Math.random() * (2500 - 500 + 1)) + 500;
    logger.info(`Applying randomized jitter delay of ${jitterMs}ms`, { event: 'jitter_delay' });
    await new Promise(resolve => setTimeout(resolve, jitterMs));
    next();
};

// Governance Middleware: Block Destructive Commands and Prune Context
const blockedCommands = ['rm -rf', 'mkfs', 'format', 'del '];

const governanceMiddleware = (req: Request, res: Response, next: Function) => {
    if (req.body) {
        const bodyString = JSON.stringify(req.body);

        // 1. Block destructive commands
        if (blockedCommands.some(cmd => bodyString.includes(cmd))) {
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

        // 2. Prune Context Windows > ~64k tokens (approx 256,000 chars)
        if (bodyString.length > 256000 && Array.isArray(req.body.messages)) {
            logger.info('Governance: Pruning excessive context window', { length: bodyString.length, event: 'governance_prune' });

            // Keep first message (system prompt) and last 2 messages (latest context)
            if (req.body.messages.length > 3) {
                const first = req.body.messages[0];
                const lastTwo = req.body.messages.slice(-2);
                req.body.messages = [
                    first,
                    { role: 'system', content: '[SYSTEM NOTE: Middle conversation history pruned to preserve token budget]' },
                    ...lastTwo
                ];
            } else {
                // If it's a huge payload but only a few messages, just truncate the last message's content
                const lastMsg = req.body.messages[req.body.messages.length - 1];
                if (typeof lastMsg.content === 'string') {
                    lastMsg.content = lastMsg.content.substring(0, 100000) + '... [SYSTEM NOTE: Content truncated to preserve token budget]';
                }
            }
        }
    }
    next();
};

// Middleware to intercept payloads before proxying
const payloadInterceptor = (req: Request, res: Response, next: Function) => {
    if (req.body && Object.keys(req.body).length > 0) {
        const parsed = llmRequestSchema.safeParse(req.body);
        if (parsed.success) {
            logger.info('Outbound LLM Call', {
                route: req.path,
                model: parsed.data.model,
                event: 'intercept_success'
            });
            // Estimate tokens from request body length (~4 chars per token)
            const estimatedTokens = Math.round(JSON.stringify(req.body).length / 4);
            statsCollector.recordRequest(estimatedTokens);
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

// Route all V1 API requests to Anthropic / OpenAI as a pass-through Gateway
const proxyOptions: Options = {
    target: process.env.ANTHROPIC_URL || 'https://api.anthropic.com', // Default target, configurable by env
    changeOrigin: true,
    pathRewrite: (path, req) => {
        const model = (req as any).body?.model || '';
        if (model.startsWith('gemini-')) {
            return path.replace(/^\/v1/, '/v1beta'); // Gemini APIs use /v1beta
        }
        return path;
    },
    router: (req) => {
        // Dynamic router based on parsed body
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
        proxyReq: (proxyReq, req, res) => {
            // Fix body stream since express.json() consumed it
            fixRequestBody(proxyReq, req);
            logger.info('Forwarding request', { host: proxyReq.host, path: proxyReq.path, event: 'proxy_forward' });
        },
        proxyRes: (proxyRes, req, res) => {
            // Monitor response streams
            logger.info('Received response from upstream', { statusCode: proxyRes.statusCode, event: 'proxy_response' });
        }
    }
};

app.use('/v1', rateLimiter, jitterMiddleware, governanceMiddleware, payloadInterceptor, createProxyMiddleware(proxyOptions) as any);

// ──── Orchestrator API ────

// POST /api/tasks — Create and analyze a new task
app.post('/api/tasks', async (req: Request, res: Response): Promise<any> => {
    const { input } = req.body;
    if (!input || typeof input !== 'string' || !input.trim()) {
        return res.status(400).json({ error: 'Missing or empty "input" field' });
    }

    const task = orchestrator.createTask(input.trim());
    const analyzed = await orchestrator.analyzeTask(task.id);

    return res.status(201).json(analyzed);
});

// GET /api/tasks — List all tasks
app.get('/api/tasks', (req: Request, res: Response) => {
    res.json(orchestrator.getAllTasks());
});

// GET /api/tasks/:id — Get specific task
app.get('/api/tasks/:id', (req: Request, res: Response): any => {
    const task = orchestrator.getTask(String(req.params.id));
    if (!task) return res.status(404).json({ error: 'Task not found' });
    return res.json(task);
});

// POST /api/tasks/:id/dispatch — Dispatch a task to an agent
app.post('/api/tasks/:id/dispatch', async (req: Request, res: Response): Promise<any> => {
    const taskId = String(req.params.id);
    const task = orchestrator.getTask(taskId);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    // Find an idle agent or use the first available
    const agents = fleetRegistry.getAll();
    const idleAgent = agents.find(a => a.state === 'Idle') || agents[0];
    const agentId = idleAgent?.id;

    const dispatched = await orchestrator.dispatchTask(taskId, agentId);

    // If we have an agent, update its state
    if (agentId) {
        fleetRegistry.updateAgent(agentId, {
            state: 'Working',
            task: task.rawInput.substring(0, 60) + (task.rawInput.length > 60 ? '...' : '')
        });
    }

    // Actually spawn the process in an interactive terminal session
    const commandToRun = task.command || 'gemini';
    const argsToRun = ['-p', task.rawInput];
    const session = terminalManager.createSession(taskId, commandToRun, argsToRun);

    session.on('exit', (code) => {
        if (code !== 0) {
            orchestrator.failTask(taskId, `Process exited with code ${code}`);
        } else {
            orchestrator.completeTaskStep(taskId, task.steps[task.steps.length - 1]?.id || 'unknown');
        }
        if (agentId) {
            fleetRegistry.updateAgent(agentId, { state: 'Idle', task: 'Ready' });
        }
    });

    return res.json(dispatched);
});

// POST /api/tasks/:id/terminate — Terminate an active task
app.post('/api/tasks/:id/terminate', (req: Request, res: Response): any => {
    const taskId = String(req.params.id);
    const task = orchestrator.getTask(taskId);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    terminalManager.terminateSession(taskId);
    orchestrator.failTask(taskId, 'Terminated by user');
    if (task.assignedAgent) {
        fleetRegistry.updateAgent(task.assignedAgent, { state: 'Idle', task: 'Ready' });
    }

    return res.json({ message: 'Task terminated successfully' });
});

// ──── Fleet API ────

// GET /api/fleet — Get fleet state
app.get('/api/fleet', (req: Request, res: Response) => {
    res.json(fleetRegistry.getAll());
});

// ──── Stats API ────

// GET /api/stats — Get live system stats
app.get('/api/stats', (req: Request, res: Response) => {
    res.json(statsCollector.getStats());
});

// ──── CLI Orchestration Endpoint (Legacy) ────
app.post('/api/cli/run', async (req: Request, res: Response): Promise<any> => {
    const { command, args } = req.body;

    // Command validation
    const allowedCommands = process.env.NODE_ENV === 'test'
        ? ['gemini', 'codex', 'claude', 'node']
        : ['gemini', 'codex', 'claude'];

    if (!command || !allowedCommands.includes(command)) {
        return res.status(403).json({ error: `Command not allowed or missing. Allowed: ${allowedCommands.join(', ')}` });
    }

    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Transfer-Encoding', 'chunked');

    const worker = new Worker(command, args || []);

    // Register the worker process as an agent in the fleet
    const agentId = crypto.randomUUID();
    fleetRegistry.registerAgent(agentId, `${command}-worker`, command);

    worker.on('data', (data: string) => {
        res.write(data);
        // Update agent state
        fleetRegistry.updateAgent(agentId, { state: 'Working', task: 'Processing CLI output...' });
    });

    worker.on('close', (code: number) => {
        res.end(`\n[Process exited with code ${code}]`);
        fleetRegistry.updateAgent(agentId, {
            state: 'Idle',
            task: `Completed (exit ${code})`
        });
    });

    const started = await worker.start();

    if (!started) {
        fleetRegistry.updateAgent(agentId, { state: 'Blocked', task: 'Failed to start' });
        return res.end(`\n[Process error: Failed to start worker]`);
    }
});

// Healthcheck endpoint
app.get('/health', (req, res) => {
    const stats = statsCollector.getStats();
    res.json({
        status: 'ok',
        component: 'autonomous-execution-proxy',
        fleet: { total: stats.totalAgents, active: stats.activeProxies },
        tasks: { active: stats.activeTasks, completed: stats.completedTasks },
        uptime: stats.uptime
    });
});

if (require.main === module) {
    const httpServer = createServer(app);

    // Create WebSocket servers
    const { transport: wsTransport, wss: logsWss } = createLogStream();
    logger.add(wsTransport);

    const fleetWss = fleetRegistry.createWebSocketServer();
    const terminalWss = new WebSocketServer({ noServer: true });

    // Forward task events to WebSocket log stream
    orchestrator.on('task_created', (task) => {
        logger.info(`📋 Task created [${task.mode.toUpperCase()}]: ${task.rawInput.substring(0, 80)}`, {
            event: 'orchestrator_task_created',
            taskId: task.id,
            mode: task.mode,
            complexity: task.complexity
        });
    });

    orchestrator.on('task_updated', (task) => {
        logger.info(`📋 Task ${task.id.substring(0, 8)}… → ${task.status}`, {
            event: 'orchestrator_task_updated',
            taskId: task.id,
            status: task.status
        });
    });

    httpServer.listen(PORT, '127.0.0.1', () => {
        logger.info(`🚀 [BACKEND] Supervisor Reverse Proxy Gateway listening locally on http://127.0.0.1:${PORT}`, { event: 'server_start' });
        logger.info(`🔒 [SECURITY] Bound strictly to localhost loopback.`, { event: 'security_bind' });
        logger.info(`📡 [BACKEND] WebSocket log stream available at ws://127.0.0.1:${PORT}/ws/logs`, { event: 'ws_stream_ready' });
        logger.info(`🛸 [FLEET] WebSocket fleet stream available at ws://127.0.0.1:${PORT}/ws/fleet`, { event: 'fleet_stream_ready' });
        logger.info(`🧠 [ORCHESTRATOR] Task orchestration API available at /api/tasks`, { event: 'orchestrator_ready' });
        logger.info(`📊 [STATS] Live stats API available at /api/stats`, { event: 'stats_ready' });
    });

    httpServer.on('upgrade', (request: any, socket: any, head: any) => {
        const url = request.url || '';
        
        if (url.startsWith('/ws/logs')) {
            logsWss.handleUpgrade(request, socket, head, (ws: WebSocket) => {
                logsWss.emit('connection', ws, request);
            });
        } else if (url.startsWith('/ws/fleet')) {
            fleetWss.handleUpgrade(request, socket, head, (ws: WebSocket) => {
                fleetWss.emit('connection', ws, request);
            });
        } else if (url.startsWith('/ws/terminal/')) {
            terminalWss.handleUpgrade(request, socket, head, (ws: WebSocket) => {
                terminalWss.emit('connection', ws, request);
            });
        } else {
            socket.destroy();
        }
    });

    terminalWss.on('connection', (ws: WebSocket, req: any) => {
        const taskId = req.url?.split('/').pop();
        if (!taskId) return ws.close();

        const session = terminalManager.getSession(taskId);
        if (!session) {
            ws.send(JSON.stringify({ type: 'error', data: 'Task terminal session not found or already ended.' }));
            return ws.close();
        }

        // Send previously buffered output
        const buffer = session.getBuffer();
        if (buffer) {
            ws.send(JSON.stringify({ type: 'output', data: buffer }));
        }

        const onData = (data: string) => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'output', data }));
            }
        };

        const onExit = (code: number) => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'exit', code }));
                ws.close();
            }
        };

        session.on('data', onData);
        session.on('exit', onExit);

        ws.on('message', (msg: any) => {
            try {
                const parsed = JSON.parse(msg.toString());
                if (parsed.type === 'input') {
                    session.write(parsed.data);
                }
            } catch (err) { }
        });

        ws.on('close', () => {
            session.off('data', onData);
            session.off('exit', onExit);
        });
    });

    const SSH_PORT = Number(process.env.SSH_PORT || 2222);
    logger.info('Generating ephemeral RSA host key for SSH Server...', { event: 'ssh_key_gen' });
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
export { orchestrator, fleetRegistry, statsCollector };
