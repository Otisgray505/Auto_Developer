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
exports.Worker = void 0;
const node_child_process_1 = require("node:child_process");
const node_events_1 = require("node:events");
const os = __importStar(require("node:os"));
const node_stream_1 = require("node:stream");
const acp = __importStar(require("@agentclientprotocol/sdk"));
const acp_handlers_1 = require("./acp-handlers");
const logger_1 = require("./logger");
class Worker extends node_events_1.EventEmitter {
    command;
    args;
    process;
    connection;
    state = 'stopped';
    sessionId;
    constructor(command, args = []) {
        super();
        this.command = command;
        this.args = args;
    }
    async start() {
        try {
            const isWindows = os.platform() === 'win32';
            this.process = (0, node_child_process_1.spawn)(this.command, this.args, {
                cwd: process.cwd(),
                env: process.env,
                shell: isWindows,
                stdio: ['pipe', 'pipe', 'inherit']
            });
            this.state = 'running';
            this.process.on('exit', (code) => {
                if (code !== 0 && this.state !== 'stopped') {
                    this.state = 'crashed';
                }
                else {
                    this.state = 'stopped';
                }
                this.emit('close', code ?? 0);
            });
            // Initialize ACP Client Connection
            const input = node_stream_1.Writable.toWeb(this.process.stdin);
            const output = node_stream_1.Readable.toWeb(this.process.stdout);
            const stream = acp.ndJsonStream(input, output);
            const handlers = new acp_handlers_1.AcpGovernanceHandlers((data) => this.emit('data', data), (newState) => { this.state = newState; });
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
        }
        catch (err) {
            logger_1.logger.error('Failed to spawn ACP worker', { error: String(err), event: 'acp_spawn_error' });
            this.state = 'crashed';
            return false;
        }
    }
    stop() {
        if (!this.process)
            return false;
        try {
            this.state = 'stopped';
            this.process.kill('SIGTERM');
            return true;
        }
        catch (err) {
            // fallback
            this.process.kill('SIGKILL');
            return false;
        }
    }
    getState() {
        return this.state;
    }
}
exports.Worker = Worker;
//# sourceMappingURL=worker.js.map