# Story 1.2: PTY Execution Engine

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a System Orchestrator,
I want to spawn headless CLI workers using programmatic pseudo-terminals (node-pty),
so that I can capture native STDIN/STDOUT and monitor precise operational emissions (OSC sequences).

## Acceptance Criteria

1. **Given** the local proxy is running
   **When** the worker initialization script is executed
   **Then** the CLI tool spawns inside a headless PTY environment
   **And** the system accurately determines states (idle, blocked, crashed) without text scraping.

## Tasks / Subtasks

- [ ] Implement robust initialization scripts (e.g., `src/worker.ts` or similar) to bootstrap PTY workers. (AC: 1)
  - [ ] Integrate `node-pty` into the application.
  - [ ] Implement logic to spawn `gemini`, `codex`, or `claude` enclosed in the node-pty.
- [ ] Implement accurate operational emission monitoring (OSC sequences). (AC: 1)
  - [ ] Ensure terminal state output indicates idle, blocked, or crashed.
  - [ ] Ensure sub-millisecond latency on STDOUT interception natively without scraping.
- [ ] Establish lifecycle management. (AC: 1)
  - [ ] Implement start, restart, SIGTERM, and SIGINT propagation.

## Dev Notes

- **Relevant architecture patterns and constraints**:
  - Architecture Path: Option A (PTY + Proxy Gateway) implementation.
  - Use programmatic pseudo-terminals (e.g., `node-pty`).
  - Speed Requirements: Sub-millisecond latency on STDOUT interception compared to legacy polling.
  - Reliability: 0% failure rate due to CLI UI updates.
- **Source tree components to touch**:
  - `apps/proxy/*` (creating the worker orchestration engine)
- **Testing standards summary**:
  - Test-Driven Development (RED-GREEN-REFACTOR) is expected. Pass 100% of unit tests.

### Project Structure Notes

- Alignment with unified project structure (paths, modules, naming). Keep logic isolated in the `proxy` app so the dashboard remains clean.

### References

- [Source: epics.md#Story 1.2: PTY Execution Engine]

## Dev Agent Record

### Agent Model Used



### Debug Log References

### Completion Notes List

### File List
