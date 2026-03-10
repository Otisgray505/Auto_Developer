# Story 1.4: Governance & Blockable Tool Calls

Status: in-progress

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a System Orchestrator,
I want to automatically block destructive tool calls and prune excessive context windows,
So that malicious actions are prevented and token budgets are maintained.

## Acceptance Criteria

1. **Given** the proxy intercepts a payload from the CLI worker
   **When** the payload contains a blocked command (e.g., `rm -rf`, `format`)
   **Then** the proxy rejects the destructive command with a generated 403 Forbidden error back to the CLI.
2. **Given** the proxy intercepts a payload from the CLI worker
   **When** the payload exceeds 64k characters/tokens roughly
   **Then** the proxy truncates non-essential message history to fit within the budget before forwarding.

## Tasks / Subtasks

- [ ] Implement command blocking middleware in `apps/proxy/src/index.ts`. (AC: 1)
  - [ ] Add a configurable list of blocked commands (e.g., `rm`, `mkfs`, `del`).
  - [ ] Inspect `req.body` tool calls or command strings for matches.
  - [ ] Return standard `403 Forbidden` JSON response mocking a provider rejection.
- [ ] Implement context pruning middleware for excessive payloads. (AC: 2)
  - [ ] Check approximate string length of `messages` array payload.
  - [ ] If excessive, slice older log messages out while retaining the system prompt and latest user prompt.

## Dev Notes

- **Relevant architecture patterns and constraints**:
  - The interception happens at the `payloadInterceptor` layer right before the proxy forwards.
  - We must not break the JSON structure; if we prune, we must prune array items cleanly.
- **Source tree components to touch**:
  - `apps/proxy/src/index.ts`
  - `apps/proxy/src/index.test.ts`
- **Testing standards summary**:
  - Add RED/GREEN tests verifying 403 on bad commands and verifying payload size reduction.

### Project Structure Notes

- Keep governance logic inside the Express middleware to act as the primary Zero-Trust Gateway.

### References

- [Source: epics.md#Story 1.4: Governance & Context Pruning]

## Dev Agent Record

### Agent Model Used
- `gemini-exp-1206` (Antigravity Orchestrator + QA + CodeReview)

### Debug Log References
- Fixed payload parser limits (`body-parser` 100kb default -> `50mb` limit) in `index.ts`.
- Debugged and isolated `process.env.PROXY_RATE_LIMIT` bleed across the testing suite in `index.test.ts`.

### Completion Notes List
- Destructive commands are actively matched and blocked with JSON `403`.
- Large payloads truncating properly to conserve token budgets.

### File List
- `apps/proxy/src/index.ts`
- `apps/proxy/src/index.test.ts`
