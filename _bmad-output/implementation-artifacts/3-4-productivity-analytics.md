# Story 3.4: Productivity Analytics

Status: ready-for-dev

## Story

As a System Orchestrator,
I want to view summary cards for Token Usage, Active Tasks, and 24-hour trends,
So that I can analyze the cost and efficiency of my autonomous fleet.

## Acceptance Criteria

1. **Given** the proxy gateway is recording metrics
2. **When** I view the dashboard analytics section
3. **Then** accurate token consumption, completed task counts, and trend charts are displayed
4. **And** the data updates periodically without requiring a full page refresh.

## Tasks / Subtasks

- [ ] Task 1: Create `AnalyticsPanel` component (AC: 1, 2, 3)
  - [ ] Build glassmorphic analytics cards for Token Usage, Active Tasks, and Cost Efficiency.
  - [ ] Implement a 24-hour sparkline/mini-chart for token usage trends using pure SVG.
- [ ] Task 2: Implement periodic data refresh (AC: 4)
  - [ ] Wire up `useEffect` interval to simulate periodic metrics fetching.
  - [ ] Ensure data updates reflect in the UI without full page refresh.
- [ ] Task 3: Integrate into `page.tsx`
  - [ ] Position the analytics panel between the stats cards and the fleet matrix.

## Dev Notes

- **Relevant constraints:** Follow `frontend-specialist` agent rules. Charts must NOT use a heavy charting library — use pure SVG sparklines for a lightweight, premium feel. The analytics panel should complement the existing glassmorphic design language.
- **Source tree components:** Create `apps/dashboard/src/components/analytics-panel.tsx`. Modify `apps/dashboard/src/app/page.tsx`.
- **Testing:** Verify periodic refresh by observing the component values updating over time.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.4]

## Dev Agent Record

### Agent Model Used

Antigravity

### File List
