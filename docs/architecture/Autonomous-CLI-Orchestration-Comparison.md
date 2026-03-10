# Architecture Comparison: PTY vs. Agent Client Protocol (ACP)

This document provides a transparent, side-by-side comparison of the two execution models evaluated for the Antigravity Autonomous Orchestration Gateway.

## 1. Core Philosophy

| Feature | Legacy Approach (Node PTY) | Modern Approach (ACP) |
| :--- | :--- | :--- |
| **Communication Medium** | Raw strings containing ANSI escape codes, colors, and spinner frames over a pseudo-terminal. | Structured, strictly typed JSON-RPC 2.0 payloads over standard input/output (STDIO). |
| **State Detection** | **Guessed.** The Gateway sets a 50ms timer. If the agent stops printing characters for 50ms, it assumes the agent is "idle" or "waiting for input". | **Deterministic.** The Agent explicitly sends a JSON-RPC response when it finishes a task. State is 100% known at all times. |
| **Tool Execution** | The Agent runs terminal commands directly on the host OS. The Gateway tries to intercept risky commands via proxying the LLM API, but the execution environment is fundamentally possessed by the Agent. | The Agent *must* ask the Gateway to run tools via JSON-RPC methods (e.g., `fs/write_text_file` or `terminal/create`). The Gateway owns the execution environment. |
| **Governance & Security** | Difficult. To stop a bad command, the supervisor must kill the process (`SIGKILL`), potentially corrupting state. | Excellent. The Gateway intercepts the tool call JSON, validates it via Zod schemas, and can cleanly return a JSON Error if blocked, allowing the Agent to recover instantly. |
| **Dashboard Telemetry** | The Gateway must parse and strip ANSI color codes using Regex to send readable logs to the dashboard. | The Gateway automatically receives clean JSON payloads (`session/update`) containing exact tool metrics, thought processes, and file modifications. |

---

## 2. Will the CLI instances still be persistent?

**Yes. The shift to ACP does not alter the persistence of the Agent CLI.**

In the ACP model, the Gateway (Client) still spawns the Agent (e.g., Claude Code or a custom Node worker) as a persistent subprocess. 

**The Lifecycle:**
1. **Spawn:** Gateway starts the Agent process.
2. **Initialize:** Gateway sends the `initialize` JSON-RPC handshake.
3. **Session Open:** Gateway sends `session/new` to create a working context.
4. **Persistent Work Loop:**
   - User asks for a task. Gateway sends `session/prompt`.
   - Agent thinks, streams JSON notifications (`session/update`), and requests tool operations.
   - Agent finishes the task and sends the final response to the prompt.
   - **The Agent remains alive and idle in memory.**
   - User asks for the next task. Gateway sends the next `session/prompt`.
5. **Session Close:** Gateway kills the Agent process only when the Epic is complete or the user terminates the session.

Because they are persistent, ACP sessions avoid the heavy overhead of constantly bootstrapping new Node/Python execution environments or reloading large context windows with the LLM API providers.

---

## 3. Rework Impact on Epic 1

Epic 1 implemented `worker.ts` using the PTY screen-scraping method.

**What changes?**
- `node-pty` is removed from `worker.ts`.
- The fragile `setTimeout(..., 50)` debounce logic is deleted.
- We implement the official `@agentclientprotocol/sdk` inside `apps/proxy` to spawn and manage the subprocess via its STDIO transport.
- We map our existing Winston logging and Zod validation directly to the incoming ACP JSON-RPC method handlers. 

**What stays the same?**
- Our reverse proxy logic routing LLM requests to standard models.
- The overall architectural concept of Antigravity acting as the Zero-Trust Supervisor over autonomous child processes.
