# Story 2.1: Cloudflare Access Tunnels Integration

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an End-User,
I want to access the Web Dashboard securely from external networks via Cloudflare Tunnels,
So that I can manage the orchestration engine without exposing my local network to the internet.

## Acceptance Criteria

1. **Given** the Antigravity Supervisor and Web Dashboard are running locally
   **When** I access the designated Cloudflare Tunnel URL from an external network
   **Then** I am securely routed to the internal Dashboard
   **And** zero-trust authentication policies are enforced.

## Tasks / Subtasks

- [x] Install and configure `cloudflared` daemon within the `apps/proxy` or workspace root.
- [x] Create automation script to programmatically start the tunnel on `localhost:3000` (Dashboard).
- [x] Output the live tunnel URL to the supervisor console on startup.
- [x] Add basic Cloudflare Access protection considerations in documentation.

## Dev Notes

- **Relevant architecture patterns and constraints**:
  - We do not want to hardcode specific CF account IDs; we should support quick tunnels (trycloudflare) for rapid prototyping, or require users to authenticate if they want persistent tunnels.
- **Source tree components to touch**:
  - `apps/proxy/src/tunnel.ts` (New file)
  - `package.json` command scripts to run the tunnel
- **Testing standards summary**:
  - Ensure the script fails gracefully if `cloudflared` is not installed on the host machine.

### References

- [Source: epics.md#Epic 2: Zero-Trust External Access]

## Dev Agent Record

### Agent Model Used
Antigravity (Backend Specialist)

### Debug Log References
Test output: 18 passing tests in proxy suite (took 11.2s).

### Completion Notes List
- Existing `tunnel.ts` implementation validated.
- Added test suite `apps/proxy/src/tunnel.test.ts` to mock and verify URL terminal output logic and ENOENT coverage.
- Created `docs/cloudflare-tunnels.md` detailing quick tunnel vs persistent zero-trust access.

### File List
- `apps/proxy/src/tunnel.test.ts` (New)
- `docs/cloudflare-tunnels.md` (New)

