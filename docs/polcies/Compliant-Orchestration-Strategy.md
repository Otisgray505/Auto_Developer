# Google Policy Compliant Orchestration Guide

**Date:** 2026-03-08
**Project:** Auto_Developer (Autonomous CLI Orchestration)
**Author:** Antigravity / Agent Ecosystem

## 1. Executive Summary
This document outlines the best practices and strategic guidelines for building the `Auto_Developer` project. The core objective is to leverage the full power of the "AI Brain" (Antigravity ecosystem, Gemini, Anthropic) to orchestrate development workflows programmatically, while strictly adhering to Acceptable Use Policies, avoiding abuse triggers (like those seen in the OpenClaw incidents), and maximizing resource efficiency.

## 2. Core Compliance Principles (Avoiding the Ban Hammer)

To ensure the longevity and safety of your developer accounts across cloud AI providers, the system architecture MUST adhere to these non-negotiable compliance rules:

### A. Official API Usage & Authentication
*   **The Rule:** NEVER use unauthorized API proxies (like Antigravity-Manager) that bypass official authentication channels, forge tokens, or exploit internal/undocumented endpoints.
*   **The Implementation:** Always use official SDKs or direct HTTP requests to authorized public APIs (e.g., Gemini API via Google AI Studio or Vertex AI, OpenAI API, Anthropic API). Use your legitimate API keys or official OAuth 2.0 flows.

### B. Rate Limiting and Concurrency Governance
*   **The Rule:** Avoid machine-speed recursive loops that generate unnatural spikes in traffic, which trigger DDoS or abuse alarms.
*   **The Implementation:** 
    *   **Local Proxy Gateway Restrictions:** Your proposed Proxy Gateway (Section 3.2 of the PRD) MUST implement strict local rate-limiting. Before a sub-agent (like Claude Code) reaches the upstream API, your proxy must queue, throttle, or reject requests that exceed safe thresholds (e.g., max 15 RPM for specific models).
    *   **Circuit Breakers:** Implement circuit breakers in your execution layer. If a CLI worker falls into an error loop (requesting the same failed tool repeatedly), the Supervisor must forcefully send a `SIGINT` or `SIGTERM` to halt it before upstream quotas are blown.

### C. Quota Evasion Prohibition
*   **The Rule:** Do not use techniques designed to automatically cycle through multiple free-tier accounts or rotate IP addresses (multiboxing) to bypass billing or rate limits.
*   **The Implementation:** Centralize billing and usage tracking on official, paid tiers when you exceed free limits. Use your Proxy Gateway to monitor usage and gracefully pause operations when budgets are near depletion.

### D. Human-in-the-Loop (HITL) and Auditability
*   **The Rule:** Fully autonomous execution systems face higher scrutiny.
*   **The Implementation:** Maintain comprehensive, transparent logs of all Supervisor and CLI worker actions. Implement approval gates for high-stakes or destructive operations (e.g., executing arbitrary downloaded code, broad file system deletions, network configuration changes).

## 3. Utilizing the "AI Brain" Effectively for Optimal Development

To use the entirety of the AI brain effectively and minimize redundant or hallucinated effort, structure your development procedure as follows:

### Phase A: Architecture and Plan-Driven Development
Before writing code, use the Orchestrator and Project Planner agents.
1.  **Define:** Create highly detailed PRDs (like the `Autonomous-CLI-Orchestration-PRD.md`) and Technical Specs.
2.  **Socratic Gate:** Engaged deeply with the AI during planning to hash out edge cases (e.g., *How exactly do we handle `node-pty` resizing events? How do we differentiate between a loading spinner and a hanging process?*).
3.  **Task Breakdown:** Generate granular `task.md` checklists.
*   *Why this works:* API calls spent on planning are magnitudes cheaper and faster than API calls spent debugging a flawed, autonomously generated codebase.

### Phase B: Controlled Implementation (The PTY + Proxy Approach)
When executing the build:
1.  **Isolate Contexts:** Do not feed the entire project context to every CLI worker. Your Supervisor should dynamically inject only the relevant source files into the sub-agent's prompt context.
2.  **Proxy Gateway as the Quality Gate:** Configure your local reverse proxy to not just intercept traffic, but to *analyze* it. If a CLI worker attempts to submit an API payload that lacks sufficient context or uses a deprecated sequence, the proxy can reject it locally, saving upstream tokens and time.

### Phase C: Systematic Verification
*   Use the `clean-code` and `testing-patterns` skills. Write automated tests BEFORE autonomous agents write the core logic (TDD approach). 
*   If a CLI worker's output fails tests, the Supervisor provides the exact error log back to the worker, ensuring a focused, single-shot fix rather than a rambling investigative loop.

## 4. Specific Action Plan for the Auto_Developer PRD

Based on your PRD, here is the green-lit, optimal path forward:

1.  **The PTY Layer (Safe):** Proceed with building the Execution Layer using `node-pty`. Reading standard output and parsing ANSI escape sequences is highly efficient and perfectly compliant. This gives you exact UI state management.
2.  **The Proxy Layer (Crucial for Governance):** Build the local HTTP interceptor (e.g., in Node.js or Python/FastAPI) to sit between your CLI workers and the internet. 
    *   *Implementation Tip:* Map local domains like `api.local-orchestrator.dev` to your proxy. Have CLI workers use this endpoint.
    *   *Governance Tip:* Inside this proxy, implement the token budgeting and the "kill switch" for rogue agents.
3.  **The Frontend Dashboard:** Build a robust Next.js/React frontend that interfaces via WebSockets with your Proxy/PTY layer to provide the real-time monitoring you requested.

**Conclusion:** By focusing the AI "brain" on rigorous upfront planning and using your local Proxy Gateway to enforcing rate limits and budget controls, you achieve your autonomous orchestration goals while remaining entirely compliant with provider terms of service.
