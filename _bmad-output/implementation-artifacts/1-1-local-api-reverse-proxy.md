# Story 1.1: Local API Reverse Proxy

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a CLI worker developer,
I want a local API reverse proxy managed by the Supervisor,
so that my CLI tool can route all LLM requests through it for interception and monitoring.

## Acceptance Criteria

1. [AC1] Given a worker CLI is configured to use the proxy URL (e.g., localhost:8080/v1), When the CLI sends an API request, Then the reverse proxy successfully intercepts and logs the payload.
2. [AC2] Given an intercepted API payload, When the proxy processes the request, Then it unpacks the payload to identify the target LLM provider (Anthropic/OpenAI) before forwarding.
3. [AC3] Given a successful proxy interception, When the payload is forwarded, Then the response is seamlessly streamed or returned back to the worker CLI without breaking its integration.

## Tasks / Subtasks

- [x] Set up the HTTP reverse proxy server (AC: 1)
  - [x] Initialize project configuration and robust error handling.
  - [x] Define the `localhost:8080/v1` endpoint structure.
- [x] Implement payload interception and unpacking (AC: 2)
  - [x] Add middleware to intercept body and headers.
  - [x] Log payload metadata for observability.
- [x] Implement seamless streaming and proxy forwarding (AC: 3)
  - [x] Setup forwarding using proxy middleware.
  - [x] Ensure response chunks stream seamlessly back to the CLI.

## Dev Notes

- **Architecture:** PTY + Proxy Gateway approach identified in Option A.
- **Goal:** Emulate the OpenAI API surface to act as a drop-in replacement endpoint for tools like Claude Code or Codex.
- **Constraints:** Must not buffer streams heavily to maintain sub-millisecond execution speeds (NFR3).
- **Security:** Ensure local binding only (`127.0.0.1`) to prevent external arbitrary access.

### Project Structure Notes

- Setup should be placed in `src/proxy/` or a dedicated microservice folder.
- Follow Clean Code and API best practices.

### References

- [Source: docs/prd/Autonomous-CLI-Orchestration-PRD.md#Functional Requirements]
- [Source: docs/architecture/Autonomous-CLI-Orchestration-Comparison.md]

## Dev Agent Record

### Agent Model Used
Antigravity Default

### Debug Log References
N/A - Minor troubleshooting with node:test setup resolved via explicit promise sequentially handling servers. 

### Completion Notes List
- Local proxy configured with express and http-proxy-middleware v3
- Payload interception implemented using express.json() and fixRequestBody hook 
- Dynamic routing implemented mapping gpt-*/o1-* models to OpenAI and others to Anthropic.
- Added comprehensive E2E tests for the proxy server inside the node:test suite.

### File List
- `apps/proxy/src/index.ts`
- `apps/proxy/src/index.test.ts`
- `apps/proxy/package.json`
