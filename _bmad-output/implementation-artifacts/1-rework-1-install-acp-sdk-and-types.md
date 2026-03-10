# Story 1-Rework-1: Install ACP SDK and Types

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Gateway developer,
I want to install the `@agentclientprotocol/sdk` into the apps/proxy project,
so that the Gateway can natively communicate with agents using JSON-RPC instead of fragile PTY screen-scraping.

## Acceptance Criteria

1. [AC1] Given the `apps/proxy` project, When I run the install command, Then `@agentclientprotocol/sdk` is added to `dependencies`.
2. [AC2] Given the updated dependencies, When I run `npm run dev` or `npm test`, Then the project compiles and starts without typing errors, confirming the SDK types are correctly referenced.

## Tasks / Subtasks

- [x] Add `@agentclientprotocol/sdk` to `apps/proxy` package.json (AC: 1)
  - [x] Use npm to install the package.
- [x] Verify standard compilation (AC: 2)
  - [x] Run typescript checks.

## Dev Notes

- **Architecture:** Transitioning from PTY screen scraping to ACP JSON-RPC governance.
- **Goal:** Add the official SDK.
- **Security:** Ensure standard package safety.

### Project Structure Notes
- Modify `apps/proxy/package.json`.

### References
- [Source: docs/architecture/Autonomous-CLI-Orchestration-ACP-Strategy.md]

## Dev Agent Record

### Agent Model Used
Antigravity Default (Amelia)

### Debug Log References
- Successfully ran `npm install @agentclientprotocol/sdk` to install the official SDK for JSON-RPC standardization.

### Completion Notes List
- Added `@agentclientprotocol/sdk` to `apps/proxy/package.json`.
- Verified typescript compilation successfully completed confirming the types are visible.

### File List
- `apps/proxy/package.json`
- `apps/proxy/package-lock.json`

## Senior Developer Review (AI)
**Outcome:** Approve
**Date:** 2026-03-09

Code review completed seamlessly. The `package.json` was updated correctly and standard type validations successfully passed through `npm test`. No vulnerabilities or discrepancies were found.

