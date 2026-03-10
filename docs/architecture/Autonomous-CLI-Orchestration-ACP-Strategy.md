# Autonomous Orchestration Strategy: Agent Client Protocol (ACP) Integration

> **Date:** 2026-03-09
> **Topic:** Evolving the Antigravity Supervisor architecture from PTY screen-scraping to the Agent Client Protocol (ACP) for strict JSON-RPC governance over Worker CLIs.

## 1. Executive Summary

This document supersedes the original `Autonomous-Orchestration-Strategy.md`. While the previous architecture relied on pseudo-terminals (`node-pty`) and debounced STDOUT monitoring to manage CLI workers, we are shifting to the **Agent Client Protocol (ACP)**. 

ACP standardizes communication using strict JSON-RPC 2.0 over STDIO or local HTTP, eliminating the fragility of parsing terminal escape codes and guessing agent states. The Antigravity Gateway will act as the **ACP Client**, providing the environment, while specialized LLM CLI tools act as **ACP Agents**.

---

## 2. Evaluation of Previous Approaches vs. ACP

### Deprecated Approach: Standard Stream / PTY Wrapping (Epic 1 Implementation)
- **Mechanism:** `node-pty` spawns workers. A 50ms debounce on STDOUT guesses when the agent is `idle`.
- **Verdict:** Unreliable. Fails if the LLM takes longer than 50ms to stream the next token, causing premature `idle` state triggers.

### The New Standard: Agent Client Protocol (ACP)
- **Mechanism:** Antigravity (Client) spawns the Worker (Agent) as a subprocess. They communicate via newline-delimited JSON-RPC over STDIO.
- **Pros:** 
  - Deterministic state tracking (we know exactly when a prompt turn starts and ends).
  - Native Tool Delegation: The Agent requests `terminal/create` or `fs/write_text_file` from Antigravity via RPC.
  - Perfect Governance: Antigravity can programmatically approve, log, or block these requests before they execute on the host system.
- **Verdict:** The foundational architecture for production-grade Zero-Trust Autonomous Orchestration.

---

## 3. Bidirectional Communication & Governance Protocol (ACP Flow)

Under the new architecture, the interaction lifecycle is strictly defined by ACP schemas:

1. **Initialization:** Antigravity launches the worker (e.g., Claude Code or a custom Node worker) and sends `initialize` to negotiate capabilities.
2. **Session Setup:** Antigravity sends `session/new` to create a workspace context.
3. **Execution (Prompt Turn):** 
   - Antigravity sends `session/prompt` (e.g., "Implement feature X").
   - The Agent streams progress back via `session/update` notifications (thought process, tool calls).
   - If the Agent needs to modify a file, it sends an `fs/write_text_file` method request to Antigravity.
   - **Governance Gate:** Antigravity validates the `fs/write_text_file` request against its local Zod schemas and security policies. If approved, it performs the write and returns the result. If blocked, it returns an RPC error.
4. **Completion:** The Agent finishes its turn and responds to the original `session/prompt` request with a `StopReason`.

---

## 4. The Antigravity Gateway Backend Layout (Updated)

To support ACP, the backend (`apps/proxy`) requires the following layered architecture:

1. **The Brain (Antigravity Supervisor)**
   - Decomposes Epics and Stories. Determines when to spawn Workers.
2. **The ACP Host (The Client Environment)**
   - Replaces `worker.ts`. Uses `@agentclientprotocol/sdk` to spawn processes, connect via stdio transport, and listen for incoming RPC method calls from the workers.
3. **The Governance Interceptor (Local Proxy / Validator)**
   - Intercepts outbound LLM traffic (if the agent makes direct API calls) OR intercepts the ACP tool call requests (`terminal/create`, etc.) to run them through `zod` and Winston.
4. **The Edge (Dashboard & External Access)**
   - Cloudflare Tunnels expose the Supervisor securely. The frontend connects via WebSockets to consume real-time ACP `session/update` notifications, rendering beautiful logs without parsing terminal strings.

---

## 5. Next Steps for Refactoring

1. Install `@agentclientprotocol/sdk` in `apps/proxy`.
2. Refactor `src/worker.ts` to replace the raw `node-pty` debounce logic with ACP Client initialization and STDIO transport.
3. Implement ACP Method Handlers for `fs/*` and `terminal/*`, wrapping them in our existing Winston logging and Zod validation.
4. Update frontend telemetry logic to ingest JSON-RPC payloads instead of raw terminal STDOUT strings.
