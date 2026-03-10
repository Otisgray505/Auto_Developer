import { z } from 'zod';
import * as acp from '@agentclientprotocol/sdk';
export declare const writeTextFileSchema: z.ZodObject<{
    path: z.ZodString;
    content: z.ZodString;
}, z.core.$loose>;
export declare const readTextFileSchema: z.ZodObject<{
    path: z.ZodString;
}, z.core.$loose>;
export declare const createTerminalSchema: z.ZodObject<{
    command: z.ZodString;
    args: z.ZodOptional<z.ZodArray<z.ZodString>>;
    cwd: z.ZodOptional<z.ZodString>;
}, z.core.$loose>;
export declare class AcpGovernanceHandlers implements acp.Client {
    private onData;
    private onStateChange;
    constructor(onData: (data: string) => void, onStateChange: (state: 'running' | 'idle' | 'blocked') => void);
    requestPermission(params: acp.RequestPermissionRequest): Promise<acp.RequestPermissionResponse>;
    sessionUpdate(params: acp.SessionNotification): Promise<void>;
    writeTextFile(params: acp.WriteTextFileRequest): Promise<acp.WriteTextFileResponse>;
    readTextFile(params: acp.ReadTextFileRequest): Promise<acp.ReadTextFileResponse>;
    createTerminal(params: acp.CreateTerminalRequest): Promise<acp.CreateTerminalResponse>;
}
//# sourceMappingURL=acp-handlers.d.ts.map