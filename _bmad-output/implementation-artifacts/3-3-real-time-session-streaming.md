# Story 3.3: Real-Time CI/AICY2 Session Streaming

Status: ready-for-dev

## Story

As a System Orchestrator,
I want to see a live activity stream of commands and STDOUT from connected workers,
So that I can monitor execution progress in real-time.

## Acceptance Criteria

1. **Given** a CLI worker is executing tasks
2. **When** I look at the main glass panel on the Dashboard
3. **Then** the STDOUT and executed commands stream smoothly via WebSocket
4. **And** syntax highlighting is applied appropriately.

## Tasks / Subtasks

- [ ] Task 1: Create live activity stream UI component (AC: 1, 2)
  - [ ] Extract the current static "Live Network Interceptions" area into a standalone `ActivityStream` component.
  - [ ] Implement a glassmorphic terminal/console UI layer.
- [ ] Task 2: Implement streaming & syntax highlighting (AC: 3, 4)
  - [ ] Wire up a placeholder WebSocket or interval-based stream to simulate incoming STDOUT/commands.
  - [ ] Implement auto-scrolling to the latest log entry.
  - [ ] Add basic syntax/log level highlighting (e.g., error in red, command in blue, standard output in dim text).

## Dev Notes

- **Relevant architecture patterns and constraints:** Follow the `frontend-specialist` agent rules. The activity stream should not look like a standard boring terminal. Use the custom Fira Code font for the terminal output, embedded within a premium glass container. Ensure smooth scrolling performance.
- **Source tree components to touch:** `apps/dashboard/src/app/page.tsx` or create a new client component `apps/dashboard/src/components/activity-stream.tsx`.
- **Testing standards summary:** Verify that new entries appear seamlessly at the bottom and the container auto-scrolls.

### Project Structure Notes

- Alignment with unified project structure: Componentize into `apps/dashboard/src/components/activity-stream.tsx`.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 3: AI Fleet Management Dashboard]

## Dev Agent Record

### Agent Model Used

Antigravity

### Debug Log References

### Completion Notes List

### File List
