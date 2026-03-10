import { describe, it } from 'node:test';
import assert from 'node:assert';
import path from 'path';
import { AcpGovernanceHandlers } from './acp-handlers';
import * as acp from '@agentclientprotocol/sdk';

describe('ACP Governance Handlers', () => {
    const mockOnData = (data: string) => { };
    const mockOnStateChange = (state: 'running' | 'idle' | 'blocked') => { };

    const handlers = new AcpGovernanceHandlers(mockOnData, mockOnStateChange);

    it('should allow writeTextFile within the current working directory', async () => {
        const safePath = 'test-safe-file.txt';
        try {
            const response = await handlers.writeTextFile({
                sessionId: 'test-session',
                path: safePath,
                content: 'safe content'
            });
            assert.deepStrictEqual(response, {});
        } catch (error) {
            assert.fail('Should not block a safe file write');
        }
    });

    it('should block writeTextFile outside the current working directory', async () => {
        const unsafePath = '../outside-file.txt';
        await assert.rejects(
            async () => {
                await handlers.writeTextFile({
                    sessionId: 'test-session',
                    path: unsafePath,
                    content: 'dangerous content'
                });
            },
            (err: any) => {
                assert.ok(err instanceof acp.RequestError, 'Expected an ACP RequestError');
                assert.strictEqual(err.code, -32602); // invalid params code
                assert.strictEqual(err.message, 'Invalid params');
                return true;
            }
        );
    });

    it('should allow createTerminal without options', async () => {
        try {
            const response = await handlers.createTerminal({
                sessionId: 'test-session',
                command: 'echo "hello"'
            });
            assert.ok(response.terminalId, 'Should return a terminal handle ID');
        } catch (error) {
            assert.fail('Should not block a basic terminal creation');
        }
    });

    it('should block createTerminal with unsafe cwd', async () => {
        await assert.rejects(
            async () => {
                await handlers.createTerminal({
                    sessionId: 'test-session',
                    command: 'ls',
                    cwd: '../'
                });
            },
            (err: any) => {
                assert.ok(err instanceof acp.RequestError, 'Expected an ACP RequestError');
                assert.strictEqual(err.code, -32602);
                assert.strictEqual(err.message, 'Invalid params');
                return true;
            }
        );
    });

    it('should transition to blocked state when requestPermission is handled', async () => {
        let capturedState = '';
        const stateHandler = new AcpGovernanceHandlers(
            () => { },
            (state) => { capturedState = state; }
        );

        await stateHandler.requestPermission({
            sessionId: 'test-session',
            options: [],
            toolCall: {
                title: 'Dangerous API',
                type: 'function',
                function: { name: 'nuke', arguments: '{}' }
                // The exact shape depends on ToolCallUpdate; 'title' and 'type' usually suffice for the mock handler internally.
            } as any
        });

        assert.strictEqual(capturedState, 'blocked', 'State should be blocked');
    });
});
