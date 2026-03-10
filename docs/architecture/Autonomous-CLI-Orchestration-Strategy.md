# Autonomous Orchestration Strategy & Multi-Approach Analysis

> **Date:** 2026-03-07
> **Topic:** Efficient and Secure Autonomous Workflows integrating Antigravity as Supervisor with CLI Tools (Claude Code, Codex, Gemini CLI).

## 1. Executive Summary

This document expands upon the initial `Autonomous-Orchestration-Strategy-20260307.md`. While the original proposal heavily emphasized a **Tmux + File System** approach, this research introduces standard backend and distributed systems architectures that provide substantially higher reliability, deeper governance, and robust security for a Swarm orchestration model.

The ultimate goal is for **Antigravity** to act as the Supervisor, delegating work to specialized CLI clients (Workers), managing their lifecycles bidirectionally, and exposing itself for external execution via Web, SSH, or other optimal vectors.

---

## 2. Multi-Approach Comparison for Worker Execution

Managing interactive CLI applications autonomously is notoriously difficult because CLIs are designed for human standard input (STDIN) and stdout (STDOUT), often using ANSI escape codes for coloring and spinners. We evaluate 4 primary strategies:

### Approach A: The Multiplexer Pipeline (Tmux/Screen + File System)

*The strategy outlined in the initial research doc.*

- **Mechanism:** Antigravity drops a task in a `task-queue` folder. A daemon picks it up, runs `tmux send-keys` into a detached session running Claude Code, and periodically screenscrapes output via `tmux capture-pane`.
- **Pros:** Conceptually simple; visually verifiable by attaching a human to the tmux session; language agnostic.
- **Cons:** **Extremely fragile.** Screen-scraping breaks easily on UI updates (progress bars, spinners). Race conditions are common when determining if a CLI is "done" processing.
- **Verdict:** Good for prototyping, unacceptable for production-grade reliability.

### Approach B: Standard Stream / PTY Wrapping (node-pty / pexpect)

- **Mechanism:** Using backend libraries like `node-pty` (Node.js) or `pexpect` (Python), Antigravity spawns the worker CLIs locally within pseudo-terminals. A wrapper logic intercepts the data streams.
- **Pros:** Native programmatic control. We can intercept STDOUT stream events instantly rather than polling. We can inject STDIN instantly. We can gracefully handle SIGTERM/SIGINT.
- **Cons:** Still requires regex parsing of CLI output to determine state boundaries (e.g., waiting for the sequence `? >` to know the CLI wants input).
- **Verdict:** Much more reliable than Tmux. Highly recommended for local execution of opaque CLI binaries.

### Approach C: The API Proxy Interception Model (The "Antigravity Gateway")

- **Mechanism:** Instead of Antigravity parsing STDOUT, Antigravity acts as a Local API Reverse Proxy (e.g., mocking the Anthropic/OpenAI base URL). Claude Code and Codex are configured to hit `http://localhost:8080/v1` (controlled by Antigravity).
- **Pros:** **Perfect Governance.** Antigravity has X-Ray vision into every LLM request the worker makes. It can intercept, modify, block, or approve tool calls precisely at the network layer before the LLM actually sees them.
- **Cons:** Requires the CLI tool to support custom Base URLs (which Claude Code and most tools do).
- **Verdict:** **The absolute best approach for Security and Governance.**

### Approach D: Containerized Sandboxing (Docker/Kubernetes Pods)

- **Mechanism:** Every worker CLI runs inside an ephemeral, locked-down Docker container. Antigravity communicates with them via the Docker Engine API (e.g., `docker exec`).
- **Pros:** **Ultimate Security.** Full blast-radius mitigation. If Claude Code hallucinates and tries to `rm -rf /`, it only destroys the ephemeral container. Network rules can completely isolate the agent.
- **Cons:** High resource overhead. Harder to share file context between the Supervisor and the Worker without complex Volume mapping.
- **Verdict:** Mandatory if running untrusted AI code or providing this as a multi-tenant cloud service. Optional but recommended for local workstation use.

---

## 3. Bidirectional Communication & Governance Protocol

To move beyond blunt "file system drops", the system needs a real-time, bidirectional protocol.

### Option 1: Local HTTP/WebSocket Sidecars

Each Worker CLI is wrapped by a small Python or Node script acting as a "Sidecar".

1. The Sidecar hosts a WebSocket client.
2. The Antigravity Supervisor hosts a WebSocket Server.
3. **Privileged Governance:** The Supervisor issues commands: `{ "action": "interrupt", "reason": "budget_exceeded" }`. The Sidecar intercepts this and sends `SIGINT` (Ctrl+C) to the underlying CLI process.

### Option 2: Message Broker (Redis Pub/Sub or MQTT)

Ideal for scaling to multiple machines.

1. Antigravity publishes a payload to the `tasks.frontend` topic on Redis.
2. An idle Worker subcribed to `tasks.frontend` picks it up, claims the lock, and begins execution.
3. The Worker publishes a heartbeat every 5 seconds to `workers.status.worker_id`.

- **Security:** Requires passing a Supervisor-issued JWT token with every message to ensure rogue agents cannot spoof Supervisor commands.

---

## 4. External Invocation Technologies (Web, SSH, API)

To interact with Antigravity from anywhere in the world securely, we must deploy modern backend edge technologies.

### Vector 1: Zero-Trust Web Dashboard (Cloudflare Access)

- **Technology:** FastAPI + React + Cloudflare Tunnels (`cloudflared`).
- **How it works:** Antigravity hosts a local web dashboard on port `3000`. A Cloudflare Tunnel securely punches out to the internet (`antigravity.mujo.dev`).
- **Security:** Cloudflare Access completely blocks traffic at the edge unless the user authenticates via GitHub/Google SSO and matches an approved email list. Zero open ports on the local network router.

### Vector 2: Specialized SSH Gateway

- **Technology:** `paramiko` or `Go crypto/ssh`.
- **How it works:** Instead of standard OpenSSH, Antigravity runs a custom SSH server backend. When the user connects (`ssh agent@antigravity.mujo.dev`), they are immediately dropped into the Antigravity Supervisor Chat prompt.
- **Security:** Highly secure, authenticated via SSH ED25519 Keys.

### Vector 3: Webhook Integrations (Messaging Platforms)

- **Technology:** Telegram API or Discord Webhooks.
- **How it works:** Antigravity listens to a specialized bot token. Users can text the bot: *"Deploy the frontend updates"*.
- **Security:** Strict user ID whitelisting. Useful for quick async commands but poor for complex code viewing.

---

## 5. Architectural Recommendation (The Hybrid Path)

For the **Mujo Agents ecosystem**, the optimal architecture blends these strategies:

1. **Execution Engine:** Use **Approach B (PTY Wrappers)** to encapsulate the CLI binaries. It is significantly faster and more reliable than Tmux.
2. **Network Governance:** Use **Approach C (API Proxying)**. Route all worker LLM traffic through an Antigravity Proxy router for absolute visibility into their reasoning and tool usage.
3. **Isolation:** Enclose major worker lifecycles in **Docker containers (Approach D)** to secure the host from autonomous hallucination damage.
4. **External Access:** Deploy **Vector 1 (Cloudflare Tunnels + Access)** for a web UI and **Vector 2 (Custom SSH Server)** for a "hacker-friendly" terminal interface.

## 6. The "CMUX" Programmatic Workspace Paradigm & Complete Backend Layout

The `manaflow-ai/cmux` repository demonstrates a brilliant approach to orchestrating multiple autonomous instances. It solves the "notification/monitoring" problem without fragile screen-scraping by introducing a **scriptable socket API** and **OSC (Operating System Command) terminal sequences**.

### How CMUX works (and how we adapt it)

1. **The Control Plane (CLI & Socket API):** CMUX runs a localized server that allows external scripts to programmatically create workspaces, split panes, and send keystrokes.
2. **The Notification Protocol (OSC Sequences):** Instead of polling STDOUT, CMUX heavily relies on agents emitting specific invisible terminal sequences (OSC 9/99/777) when they require human input or finish a task.
3. **The Adapter:** We can adopt this for Antigravity. Instead of a macOS GUI, Antigravity acts as the headless backend supervisor. When it spawns a PTY (Approach B) or Docker container (Approach D) for an agent, it manages them as "Workspaces" over a structured event bus, listening for strict notification sequences to know exactly when a worker is idle, blocked, or crashed.

### Complete Backend Technology Layout

To function as a professional project manager (the "brain" of the host storage system), the infrastructure requires 4 distinct layers:

1. **The Brain (Antigravity Supervisor)**
   - **Role:** Handles high-level project decomposition, memory retrieval, and budget governance. It holds the "master plan" and spawns workers.
2. **The Network Gateway (Antigravity API Proxy)**
   - **Role:** All worker LLM traffic (Claude Code, OpenClaw) routes through here. The Brain analyzes the payload in transit, approves destructive tool calls, and blocks errors before they hit Anthropic/OpenAI.
3. **The Workspace Fabric (CMUX-inspired Orchestration Engine)**
   - **Technology:** `node-pty` / Docker Engine API + WebSocket Event Bus.
   - **Role:** Spawns isolated environments for workers. Instructs them via STDIN and monitors their state perfectly via terminal control sequences, enabling orchestration of multiple cloud instances or local containers simultaneously.
4. **The Edge (External Access)**
   - **Technology:** Cloudflare Tunnels / Custom SSH Server.
   - **Role:** Exposes the Brain's Chat UI securely to you from anywhere, protected by Zero-Trust SSO authentication.

This architecture ensures maximum parallelism while maintaining perfect visibility and control at the network and process levels.

## 7. Next Steps for Implementation

1. Write a proof-of-concept Python/Node script using `pty` to spawn Claude Code headless and interact programmatically.
2. Establish the WebSocket event bus or Message Broker for the Supervisor to broadcast commands.
3. Define the RBAC (Role-Based Access Control) token schema for Supervisor vs Worker permissions.
