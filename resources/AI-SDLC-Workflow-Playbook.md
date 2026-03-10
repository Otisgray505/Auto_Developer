# 🚀 Antigravity & BMAD: SDLC Workflow Playbook

This playbook provides actionable, copy-pasteable command sequences and agent assignments to maximize your efficiency using the **Antigravity Kit** and the **BMAD Method** throughout the entire Software Development Lifecycle (SDLC).

---

## Phase 1: Discovery & Requirements Planning
*Goal: Move from a raw idea to structured Product Requirements Documents (PRDs) and project plans.*

**When to use:** Starting a new feature, module, or entire project.

### Workflow Sequence:

1.  **Ideation & Brainstorming**
    > Engage the creative agents to flesh out the core concepts and explore edge cases.
    ```text
    /brainstorm @bmad-agent-cis-brainstorming-coach We need to build a new [Feature/Product]. Help me brainstorm the core value proposition and technical challenges.
    ```

2.  **Generate the Product Brief**
    > Distill the brainstorm into a formal brief.
    ```text
    /create-product-brief @project-planner Based on our brainstorming session, please generate a comprehensive product brief.
    ```

3.  **Construct the Product Requirements Document (PRD)**
    > Instruct the analyst to construct the strict requirements.
    ```text
    /create-prd @bmad-agent-bmm-analyst Generate a complete PRD based on the approved product brief.
    ```

4.  **Validate the Readiness**
    > Ensure no requirements are missing before architecture begins.
    ```text
    /validate-prd @project-planner Review the PRD we just generated and identify any missing edge cases.
    ```

---

## Phase 2: Architecture & System Design
*Goal: Translate business requirements into technical blueprints, API schemas, and UI designs.*

**When to use:** Once the PRD is approved and you need to lay the technical groundwork.

### Workflow Sequence:

1.  **Define Technical Architecture**
    > Design the system structure and database schema.
    ```text
    /create-architecture @bmad-agent-bmm-architect @database-architect Based on the PRD, create the technical solution design and propose a database schema.
    ```

2.  **Plan the UI/UX Patterns**
    > Establish the frontend component structure.
    ```text
    /create-ux-design @bmad-agent-bmm-ux-designer Create the UX specifications and layout structures for the features defined in the PRD.
    ```

3.  **Generate the Implementation Plan**
    > Use the planner to break down the architecture into a step-by-step Execution Plan.
    ```text
    /plan @project-planner Based on the architecture and UX design, create a detailed implementation plan (task.md) for this feature.
    ```

---

## Phase 3: Agile Planning (Epics, Stories & Sprints)
*Goal: Organize the technical implementation plan into manageable agile artifacts.*

**When to use:** Preparing for active development sprints.

### Workflow Sequence:

1.  **Breakdown into Epics and Stories**
    > Convert the plan into agile tickets.
    ```text
    /create-epics-and-stories @bmad-agent-bmm-pm Break down our implementation plan into logical Epics and User Stories.
    ```

2.  **Prepare a specific Developer Story**
    > Create a context-rich spec file for a specific task.
    ```text
    /create-story @product-owner Create a detailed story spec file for [Story Name/ID] so the developer agent can implement it next.
    ```

3.  **Initialize the Sprint Tracker**
    > Set up the status board.
    ```text
    /sprint-planning @bmad-agent-bmm-sm Initialize the sprint tracking markdown file based on the epics we just created.
    ```

---

## Phase 4: Active Development (The Dev Loop)
*Goal: Write the code, build the UI, and implement the APIs.*

**When to use:** Daily coding activities.

### Workflow Sequence:

1.  **Execute a Planned Story (Major Work)**
    > Pass a prepared story spec directly to the dev agents.
    ```text
    /dev-story @frontend-specialist @backend-specialist Implement the story detailed in [Path to Story File].
    ```

2.  **Ad-Hoc Implementation (Quick Tasks)**
    > Use when you need a fast turnaround for a small feature without a heavy PRD.
    ```text
    /quick-dev @bmad-agent-bmm-dev Implement a quick tech spec to add a [Specific Functionality] to the [Component Name].
    ```

3.  **Refactoring and Enhancements**
    > When code exists, but needs improvement or new edge-cases handled.
    ```text
    /enhance @code-archaeologist Refactor the `[Filename]` to improve performance and adhere to `@[skills/clean-code]`.
    ```

4.  **Debugging and Problem Solving**
    > When things break, use structured debugging.
    ```text
    /debug @debugger The [Component] is failing with [Error Message]. Use the 4-phase systematic debugging skill to find the root cause.
    ```

---

## Phase 5: Quality Assurance & Automated Testing
*Goal: Ensure the code is robust, secure, and meets all requirements.*

**When to use:** After development is complete, before merging or deploying.

### Workflow Sequence:

1.  **Adversarial Code Review**
    > Invite the AI to be cynical and tear apart your implementation.
    ```text
    /bmad-review-adversarial-general @security-auditor Perform a cynical review of the recent changes to [Module Name] and report all vulnerabilities and bad practices.
    ```

2.  **Generate E2E and Unit Tests**
    > Build the automated safety net.
    ```text
    /qa-generate-e2e-tests @test-engineer @bmad-agent-bmm-qa Create Playwright E2E tests and Jest unit tests for the newly implemented [Feature Name].
    ```

3.  **Run Master Validation Scripts (CLI)**
    > Always run these local scripts before calling a task complete.
    ```bash
    # Run in your terminal, or ask the Orchestrator to run it
    python .agent/scripts/checklist.py .
    python .agent/scripts/verify_all.py .
    ```

---

## Phase 6: Deployment & Agile Review
*Goal: Ship the code and learn from the sprint.*

**When to use:** End of the sprint cycle.

### Workflow Sequence:

1.  **Pre-Flight Deployment Checks**
    > Let the DevOps agent confirm everything is ready.
    ```text
    /deploy @devops-engineer Perform pre-flight deployment checks and execute the deployment sequence for this sprint's release.
    ```

2.  **Run the Sprint Retrospective**
    > Analyze what went well and what failed.
    ```text
    /retrospective @bmad-agent-bmm-sm Run a retrospective on the completed Epic [Epic Name]. Extract lessons learned and update our methodology.
    ```
    
3.  **Check Sprint Status**
    > See where you stand overall.
    ```text
    /sprint-status @bmad-agent-bmm-pm Summarize the current sprint status and highlight any blocking risks for the next phase.
    ```

---
> **The Antigravity Golden Rule:** Always verify that an agent announces `🤖 Applying knowledge of @[agent-name]...` before it writes code. If it doesn't, stop it and explicitly tag the specialist.
