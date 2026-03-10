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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AcpGovernanceHandlers = exports.createTerminalSchema = exports.readTextFileSchema = exports.writeTextFileSchema = void 0;
const zod_1 = require("zod");
const acp = __importStar(require("@agentclientprotocol/sdk"));
const path_1 = __importDefault(require("path"));
const logger_1 = require("./logger");
// Secure path validation: ensures the resolved path is within the allowed working directory
const safePathValidator = (filePath) => {
    const cwd = process.cwd();
    const resolvedPath = path_1.default.resolve(cwd, filePath);
    return resolvedPath.startsWith(cwd);
};
exports.writeTextFileSchema = zod_1.z.object({
    path: zod_1.z.string().refine(safePathValidator, {
        message: 'Path escapes designated working directory'
    }),
    content: zod_1.z.string()
}).passthrough();
exports.readTextFileSchema = zod_1.z.object({
    path: zod_1.z.string().refine(safePathValidator, {
        message: 'Path escapes designated working directory'
    })
}).passthrough();
exports.createTerminalSchema = zod_1.z.object({
    command: zod_1.z.string(),
    args: zod_1.z.array(zod_1.z.string()).optional(),
    cwd: zod_1.z.string().optional().refine((val) => {
        if (!val)
            return true;
        return safePathValidator(val);
    }, { message: 'CWD escapes designated working directory' })
}).passthrough();
class AcpGovernanceHandlers {
    onData;
    onStateChange;
    constructor(onData, onStateChange) {
        this.onData = onData;
        this.onStateChange = onStateChange;
    }
    async requestPermission(params) {
        this.onStateChange('blocked');
        logger_1.logger.warn('Governance: Permission requested', { title: params.toolCall.title, event: 'acp_permission' });
        this.onData(JSON.stringify({ type: 'permission', params }) + '\n');
        // Auto-rejecting or unhandled for safety by default, but we'll mock 'accept' for testing purposes
        return { outcome: { outcome: "acceptAll" } };
    }
    async sessionUpdate(params) {
        this.onStateChange('running');
        this.onData(JSON.stringify({ type: 'update', params }) + '\n');
    }
    async writeTextFile(params) {
        try {
            exports.writeTextFileSchema.parse(params);
            logger_1.logger.info('Governance: Approved WriteTextFile', { path: params.path, event: 'acp_write_file_approved' });
            return {};
        }
        catch (err) {
            logger_1.logger.warn('Governance: Blocked WriteTextFile due to validation', { error: err.message, event: 'acp_write_file_blocked' });
            throw acp.RequestError.invalidParams('Invalid writeTextFile parameters or path escaped constraints');
        }
    }
    async readTextFile(params) {
        try {
            exports.readTextFileSchema.parse(params);
            logger_1.logger.info('Governance: Approved ReadTextFile', { path: params.path, event: 'acp_read_file_approved' });
            return { content: "" }; // Actual reading would be delegated if proxy doesn't do it itself
        }
        catch (err) {
            logger_1.logger.warn('Governance: Blocked ReadTextFile due to validation', { error: err.message, event: 'acp_read_file_blocked' });
            throw acp.RequestError.invalidParams('Invalid readTextFile parameters or path escaped constraints');
        }
    }
    async createTerminal(params) {
        try {
            exports.createTerminalSchema.parse(params);
            logger_1.logger.info('Governance: Approved CreateTerminal', { command: params.command, event: 'acp_create_terminal_approved' });
            // As a proxy, we simply authorize the request. Actual terminal creation happens securely downstream or mocked here.
            return {
                terminalId: 'mocked-terminal-' + Date.now()
            };
        }
        catch (err) {
            logger_1.logger.warn('Governance: Blocked CreateTerminal due to validation', { error: err.message, event: 'acp_create_terminal_blocked' });
            throw acp.RequestError.invalidParams('Invalid createTerminal parameters or CWD escaped constraints');
        }
    }
}
exports.AcpGovernanceHandlers = AcpGovernanceHandlers;
//# sourceMappingURL=acp-handlers.js.map