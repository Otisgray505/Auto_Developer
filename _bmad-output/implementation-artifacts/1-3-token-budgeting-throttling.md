# Story 1.3: Throttling & Circuit Breakers

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a System Orchestrator,
I want the proxy to introduce randomized latency (jitter) and enforce TPM/RPM limits,
So that the CLI workers do not trigger automated provider bans.

## Acceptance Criteria

1. **Given** a CLI worker is making rapid, sustained requests
   **When** the request exceeds the configured RPM/TPM limit or lacks think-time
   **Then** the proxy introduces a 500ms-2500ms jitter delay
   **And** returns a mocked 429 Too Many Requests to the CLI if the hard limit is breached.

## Tasks / Subtasks

- [ ] Implement randomized latency (jitter) middleware in `apps/proxy/src/index.ts`. (AC: 1)
  - [ ] Intercept incoming requests to `/v1/*`.
  - [ ] Introduce a non-blocking delay of 500ms to 2500ms.
- [ ] Implement circuit breaker / rate limiting for TPM and RPM. (AC: 1)
  - [ ] Track requests and tokens centrally within the proxy.
  - [ ] Return standard `429 Too Many Requests` status code and JSON response when hard limits are hit.

## Dev Notes

- **Relevant architecture patterns and constraints**:
  - The goal is to simulate human "think time".
  - Graceful degradation using `429` avoids catastrophic failures on the AI side and triggers backoffs.
- **Source tree components to touch**:
  - `apps/proxy/src/index.ts` (middleware components)
- **Testing standards summary**:
  - TDD must be followed. Add tests parsing the latency and mocking 429 responses in `index.test.ts`.

### Project Structure Notes

- Keep the throttling logic robust but lightweight inside the express server pipeline.

### References

- [Source: epics.md#Story 1.3: Throttling & Circuit Breakers]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
