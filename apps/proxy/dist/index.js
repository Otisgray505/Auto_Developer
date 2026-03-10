"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const cors_1 = __importDefault(require("cors"));
const http_proxy_middleware_1 = require("http-proxy-middleware");
const zod_1 = require("zod");
const worker_1 = require("./worker");
const ssh_server_1 = require("./ssh-server");
const ws_stream_1 = require("./ws-stream");
const logger_1 = require("./logger");
const crypto_1 = __importDefault(require("crypto"));
// Autonomous CLI Orchestration Gateway - Local Proxy
const app = (0, express_1.default)();
const PORT = Number(process.env.PORT || 8080);
app.use((0, cors_1.default)()); // Note: In production, explicitly set origins rather than globally enabling CORS.
// Parse JSON bodies so we can inspect the payload (required for intercepting model name)
app.use(express_1.default.json({ limit: '50mb' }));
// Zod schema for validating standard LLM proxy requests
const llmRequestSchema = zod_1.z.object({
    model: zod_1.z.string().min(1)
}).passthrough();
// Simple in-memory rate limiter (Circuit Breaker)
const WINDOW_MS = 60 * 1000; // 1 minute
const ipRequests = new Map();
const rateLimiter = (req, res, next) => {
    const maxRequests = parseInt(process.env.PROXY_RATE_LIMIT || '50', 10);
    const ip = req.ip || '127.0.0.1';
    const now = Date.now();
    const record = ipRequests.get(ip);
    if (!record || now > record.resetTime) {
        ipRequests.set(ip, { count: 1, resetTime: now + WINDOW_MS });
        return next();
    }
    if (record.count >= maxRequests) {
        logger_1.logger.warn('Circuit Breaker Triggered: Rate limit exceeded', { ip, event: 'rate_limit_exceeded' });
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
const jitterMiddleware = async (req, res, next) => {
    const jitterMs = Math.floor(Math.random() * (2500 - 500 + 1)) + 500;
    logger_1.logger.info(`Applying randomized jitter delay of ${jitterMs}ms`, { event: 'jitter_delay' });
    await new Promise(resolve => setTimeout(resolve, jitterMs));
    next();
};
// Governance Middleware: Block Destructive Commands and Prune Context
const blockedCommands = ['rm -rf', 'mkfs', 'format', 'del '];
const governanceMiddleware = (req, res, next) => {
    if (req.body) {
        const bodyString = JSON.stringify(req.body);
        // 1. Block destructive commands
        if (blockedCommands.some(cmd => bodyString.includes(cmd))) {
            logger_1.logger.warn('Governance: Blocked destructive command', { ip: req.ip, event: 'governance_block' });
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
            logger_1.logger.info('Governance: Pruning excessive context window', { length: bodyString.length, event: 'governance_prune' });
            // Keep first message (system prompt) and last 2 messages (latest context)
            if (req.body.messages.length > 3) {
                const first = req.body.messages[0];
                const lastTwo = req.body.messages.slice(-2);
                req.body.messages = [
                    first,
                    { role: 'system', content: '[SYSTEM NOTE: Middle conversation history pruned to preserve token budget]' },
                    ...lastTwo
                ];
            }
            else {
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
const payloadInterceptor = (req, res, next) => {
    if (req.body && Object.keys(req.body).length > 0) {
        const parsed = llmRequestSchema.safeParse(req.body);
        if (parsed.success) {
            logger_1.logger.info('Outbound LLM Call', {
                route: req.path,
                model: parsed.data.model,
                event: 'intercept_success'
            });
        }
        else {
            logger_1.logger.warn('Unrecognized payload shape intercepted', {
                route: req.path,
                event: 'intercept_warning'
            });
        }
    }
    next();
};
// Route all V1 API requests to Anthropic / OpenAI as a pass-through Gateway
const proxyOptions = {
    target: process.env.ANTHROPIC_URL || 'https://api.anthropic.com', // Default target, configurable by env
    changeOrigin: true,
    ws: true,
    pathRewrite: (path, req) => {
        const model = req.body?.model || '';
        if (model.startsWith('gemini-')) {
            return path.replace(/^\/v1/, '/v1beta'); // Gemini APIs use /v1beta
        }
        return path;
    },
    router: (req) => {
        // Dynamic router based on parsed body
        const model = req.body?.model || '';
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
            (0, http_proxy_middleware_1.fixRequestBody)(proxyReq, req);
            logger_1.logger.info('Forwarding request', { host: proxyReq.host, path: proxyReq.path, event: 'proxy_forward' });
        },
        proxyRes: (proxyRes, req, res) => {
            // Monitor response streams
            logger_1.logger.info('Received response from upstream', { statusCode: proxyRes.statusCode, event: 'proxy_response' });
        }
    }
};
app.use('/v1', rateLimiter, jitterMiddleware, governanceMiddleware, payloadInterceptor, (0, http_proxy_middleware_1.createProxyMiddleware)(proxyOptions));
// CLI Orchestration Endpoint
app.post('/api/cli/run', async (req, res) => {
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
    const worker = new worker_1.Worker(command, args || []);
    worker.on('data', (data) => {
        res.write(data);
    });
    worker.on('close', (code) => {
        res.end(`\n[Process exited with code ${code}]`);
    });
    const started = await worker.start();
    if (!started) {
        return res.end(`\n[Process error: Failed to start worker]`);
    }
});
// Healthcheck endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', component: 'autonomous-execution-proxy' });
});
if (require.main === module) {
    const httpServer = (0, http_1.createServer)(app);
    // Attach WebSocket log stream to the HTTP server
    const wsTransport = (0, ws_stream_1.createLogStream)(httpServer);
    logger_1.logger.add(wsTransport);
    httpServer.listen(PORT, '127.0.0.1', () => {
        logger_1.logger.info(`🚀 [BACKEND] Supervisor Reverse Proxy Gateway listening locally on http://127.0.0.1:${PORT}`, { event: 'server_start' });
        logger_1.logger.info(`🔒 [SECURITY] Bound strictly to localhost loopback.`, { event: 'security_bind' });
        logger_1.logger.info(`📡 [BACKEND] WebSocket log stream available at ws://127.0.0.1:${PORT}/ws/logs`, { event: 'ws_stream_ready' });
    });
    const SSH_PORT = Number(process.env.SSH_PORT || 2222);
    logger_1.logger.info('Generating ephemeral RSA host key for SSH Server...', { event: 'ssh_key_gen' });
    const { privateKey } = crypto_1.default.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        privateKeyEncoding: { type: 'pkcs1', format: 'pem' }
    });
    const sshServer = (0, ssh_server_1.createSshServer)(privateKey);
    sshServer.listen(SSH_PORT, '127.0.0.1', () => {
        logger_1.logger.info(`🛡️  [BACKEND] Custom SSH Server Backend listening locally on 127.0.0.1:${SSH_PORT}`, { event: 'ssh_server_start' });
    });
}
exports.default = app;
//# sourceMappingURL=index.js.map