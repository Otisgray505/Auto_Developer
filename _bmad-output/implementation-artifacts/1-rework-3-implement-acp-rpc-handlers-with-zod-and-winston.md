# Story 1-Rework-3: Implement ACP RPC Handlers with Zod and Winston

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an Orchestration Supervisor,
I want the ACP Client inside the Gateway to intercept all agent tool call requests, validate them with Zod, and log them with Winston,
so that I retain perfect Zero-Trust governance over autonomous agents attempting to write files or spawn terminals on the host OS.

## Acceptance Criteria

1. [AC1] Given an active ACP connection, When an agent requests `fs/write_text_file` or `terminal/create`, Then the Gateway intercepts the RPC method.
2. [AC2] Given an intercepted RPC method, When it is evaluated, Then the payload is strictly parsed against a Zod schema defining the allowed operations.
3. [AC3] Given an intercepted RPC method, When it is approved or blocked, Then a structured Winston telemetry log is emitted for the dashboard describing the agent action and decision.

## Tasks / Subtasks

- [x] Create `src/acp-handlers.ts` or embed handlers in `worker.ts` (AC: 1)
  - [x] Setup RPC method listeners for file system and terminal commands on the ACP Client.
- [x] Wrap handlers with Zod validation (AC: 2)
  - [x] Define strict schemas for permitted file paths and terminal commands.
- [x] Integrate Winston logging for telemetry (AC: 3)
  - [x] Emit structured JSON logs upon approval or rejection of an agent tool call.

## Dev Notes

- **Architecture:** Reestablishes the governance patterns required by the original Epic 1 PRD but at the JSON-RPC layer instead of the HTTP proxy layer.
- **Security:** Ensure agent tools cannot escape the designated working directory.

### Project Structure Notes
- Modify `apps/proxy/src/worker.ts` or create a new `acp-handlers.ts`.

### References
- [Source: docs/architecture/Autonomous-CLI-Orchestration-ACP-Strategy.md]
