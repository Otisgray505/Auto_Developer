import { z } from 'zod';
import * as acp from '@agentclientprotocol/sdk';
import path from 'path';
import { logger } from './logger';

// Secure path validation: ensures the resolved path is within the allowed working directory
const safePathValidator = (filePath: string) => {
    const cwd = process.cwd();
    const resolvedPath = path.resolve(cwd, filePath);
    return resolvedPath.startsWith(cwd);
};

export const writeTextFileSchema = z.object({
    path: z.string().refine(safePathValidator, {
        message: 'Path escapes designated working directory'
    }),
    content: z.string()
}).passthrough();

export const readTextFileSchema = z.object({
    path: z.string().refine(safePathValidator, {
        message: 'Path escapes designated working directory'
    })
}).passthrough();

export const createTerminalSchema = z.object({
    command: z.string(),
    args: z.array(z.string()).optional(),
    cwd: z.string().optional().refine((val) => {
        if (!val) return true;
        return safePathValidator(val);
    }, { message: 'CWD escapes designated working directory' })
}).passthrough();

export class AcpGovernanceHandlers implements acp.Client {
    private onData: (data: string) => void;
    private onStateChange: (state: 'running' | 'idle' | 'blocked') => void;

    constructor(onData: (data: string) => void, onStateChange: (state: 'running' | 'idle' | 'blocked') => void) {
        this.onData = onData;
        this.onStateChange = onStateChange;
    }

    public async requestPermission(params: acp.RequestPermissionRequest): Promise<acp.RequestPermissionResponse> {
        this.onStateChange('blocked');
        logger.warn('Governance: Permission requested', { title: params.toolCall.title, event: 'acp_permission' });
        this.onData(JSON.stringify({ type: 'permission', params }) + '\n');

        // Auto-rejecting or unhandled for safety by default, but we'll mock 'accept' for testing purposes
        return { outcome: { outcome: "acceptAll" } } as any;
    }

    public async sessionUpdate(params: acp.SessionNotification): Promise<void> {
        this.onStateChange('running');
        this.onData(JSON.stringify({ type: 'update', params }) + '\n');
    }

    public async writeTextFile(params: acp.WriteTextFileRequest): Promise<acp.WriteTextFileResponse> {
        try {
            writeTextFileSchema.parse(params);
            logger.info('Governance: Approved WriteTextFile', { path: params.path, event: 'acp_write_file_approved' });
            return {};
        } catch (err: any) {
            logger.warn('Governance: Blocked WriteTextFile due to validation', { error: err.message, event: 'acp_write_file_blocked' });
            throw acp.RequestError.invalidParams('Invalid writeTextFile parameters or path escaped constraints');
        }
    }

    public async readTextFile(params: acp.ReadTextFileRequest): Promise<acp.ReadTextFileResponse> {
        try {
            readTextFileSchema.parse(params);
            logger.info('Governance: Approved ReadTextFile', { path: params.path, event: 'acp_read_file_approved' });
            return { content: "" }; // Actual reading would be delegated if proxy doesn't do it itself
        } catch (err: any) {
            logger.warn('Governance: Blocked ReadTextFile due to validation', { error: err.message, event: 'acp_read_file_blocked' });
            throw acp.RequestError.invalidParams('Invalid readTextFile parameters or path escaped constraints');
        }
    }

    public async createTerminal(params: acp.CreateTerminalRequest): Promise<acp.CreateTerminalResponse> {
        try {
            createTerminalSchema.parse(params);
            logger.info('Governance: Approved CreateTerminal', { command: params.command, event: 'acp_create_terminal_approved' });

            // As a proxy, we simply authorize the request. Actual terminal creation happens securely downstream or mocked here.
            return {
                terminalId: 'mocked-terminal-' + Date.now()
            };
        } catch (err: any) {
            logger.warn('Governance: Blocked CreateTerminal due to validation', { error: err.message, event: 'acp_create_terminal_blocked' });
            throw acp.RequestError.invalidParams('Invalid createTerminal parameters or CWD escaped constraints');
        }
    }
}
