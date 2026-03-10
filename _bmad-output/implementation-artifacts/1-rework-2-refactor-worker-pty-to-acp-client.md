# Story 1-Rework-2: Refactor Worker PTY to ACP Client

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Gateway developer,
I want to refactor `worker.ts` to use the ACP Client SDK instead of raw `node-pty`,
so that agent state tracking and tool invocation rely on robust JSON-RPC rather than a fragile 50ms delay.

## Acceptance Criteria

1. [AC1] Given the `worker.ts` file, When it instantiates an agent subprocess, Then it uses the `Client` from `@agentclientprotocol/sdk` over STDIO transport.
2. [AC2] Given a spawned agent session, When the agent thinks or performs an operation, Then its status is strictly tracked via ACP `session/update` notifications rather than debouncing STDOUT.
3. [AC3] Given the refactored worker, When it receives an exit signal, Then it gracefully cleans up the ACP connection and subprocess.

## Tasks / Subtasks

- [x] Replace `node-pty` logic in `src/worker.ts` with ACP STDIO (AC: 1)
  - [x] Remove `settleTimeout` idle detection mechanism.
  - [x] Use `@agentclientprotocol/sdk` to construct the Client.
- [x] Implement robust state tracking mapped to ACP lifecycle (AC: 2)
  - [x] Map JSON-RPC `session/prompt` start and end to the running/idle state.
- [x] Implement cleanup methods (AC: 3)
  - [x] Close the client connection gracefully on termination.

## Dev Notes

- **Architecture:** This deprecates the old Epic 1 `node-pty` parsing strategy.
- **Constraints:** Must ensure standard input/output streams are directly attached or strictly forwarded to the ACP client transport.

### Project Structure Notes
- Modify `apps/proxy/src/worker.ts`.

### References
- [Source: docs/architecture/Autonomous-CLI-Orchestration-ACP-Strategy.md]
