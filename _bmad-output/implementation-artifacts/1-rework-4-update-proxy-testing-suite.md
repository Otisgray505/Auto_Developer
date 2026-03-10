# Story 1-Rework-4: Update Proxy Testing Suite

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Backend QA,
I want the unit testing suite for `apps/proxy` to mock the ACP JSON-RPC standard,
so that we can safely verify the Gateway governance logic without actually spawning risky sub-agents.

## Acceptance Criteria

1. [AC1] Given the existing `worker.test.ts` suite, When evaluating the worker implementation, Then it mocks an ACP STDIO stream instead of a raw pseudo-terminal string stream.
2. [AC2] Given the updated tests, When `npm test` runs, Then it successfully validates that unauthorized tool calls are blocked and logged by Winston dynamically.

## Tasks / Subtasks

- [x] Refactor `worker.test.ts` (AC: 1)
  - [x] Remove `node-pty` mocks.
  - [x] Introduce ACP SDK transport mocks.
- [x] Add explicit governance tests (AC: 2)
  - [x] Assert that a simulated `fs/write_text_file` outside a safe dir throws a JSON-RPC error.
  - [x] Make sure Winston logs are present during the test run assertions.

## Dev Notes

- **Goal:** Keep code coverage high and ensure the new ACP logic doesn't introduce regressions.

### Project Structure Notes
- Modify `apps/proxy/src/worker.test.ts`.

### References
- [Source: docs/architecture/Autonomous-CLI-Orchestration-ACP-Strategy.md]
