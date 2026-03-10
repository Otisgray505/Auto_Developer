# Story 3.2: AI Agent Fleet Management

Status: ready-for-dev

## Story

As a System Orchestrator,
I want to view and manage my fleet of active AI agents,
So that I can see their status (Idle, Working, Blocked) and issue Restart/Stop commands.

## Acceptance Criteria

1. **Given** multiple CLI workers are running
2. **When** I view the sidebar or grid of agents
3. **Then** I see each agent's precise operational state
4. **And** clicking 'Stop' or 'Restart' successfully executes the corresponding lifecycle script on the worker.

## Tasks / Subtasks

- [ ] Task 1: Create active agent list/grid component (AC: 1, 2)
  - [ ] Implement UI for agent cards featuring precision operational states (Idle, Working, Blocked).
  - [ ] Integrate real-time state management representing the fleet.
- [ ] Task 2: Implement action commands (AC: 4)
  - [ ] Add 'Stop' and 'Restart' action buttons for each agent.
  - [ ] Wire buttons to surrogate API calls simulating execution of lifecycle scripts on the worker backend.

## Dev Notes

- **Relevant architecture patterns and constraints:** Follow the `frontend-specialist` agent rules. Apply deep visual layers (Glassmorphism). No generic dashboards, adhere to the Purple Ban. Ensure the states (Idle, Working, Blocked) are distinctly animated. 
- **Source tree components to touch:** `apps/dashboard/src/app/page.tsx` or create a new client component for `FleetManager`.
- **Testing standards summary:** Verify state changes accurately reflect button interactions. Ensure UI matches Shadcn component specs defined in `MASTER.md`.

### Project Structure Notes

- Alignment with unified project structure: Componentize the Agent Card into `apps/dashboard/src/components/agent-card.tsx` to keep the main page clean.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 3: AI Fleet Management Dashboard]

## Dev Agent Record

### Agent Model Used

Antigravity

### Debug Log References

### Completion Notes List

### File List
