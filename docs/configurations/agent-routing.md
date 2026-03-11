# Configuration for Intercepting AI Agents

## Overview
This document explains how to configure both the **Gemini CLI** and the **Antigravity Framework** to route their LLM requests through the local Zero-Trust Supervisor Gateway (`127.0.0.1:8080`).

> **Note:** The Gemini CLI and the Antigravity Orchestrator are distinct entities. Antigravity acts as the overarching framework/orchestrator, while the Gemini CLI is one of the potential worker agents. Both must be explicitly routed to the proxy for interception.

## 1. Start the Proxy Gateway First
Before configuring any agents, ensure the backend supervisor is actively listening.
```bash
cd apps/proxy
npm run start
# Expected output: Proxy Gateway listening on http://127.0.0.1:8080
```

---

## 2. Configuring Gemini CLI
To route the Gemini CLI through the proxy, override its default base URL environment variable before execution.

**Windows (PowerShell):**
```powershell
$env:GEMINI_API_BASE_URL="http://127.0.0.1:8080/v1"
gemini -p "Your prompt here"
```

**Linux/macOS (Bash/Zsh):**
```bash
export GEMINI_API_BASE_URL="http://127.0.0.1:8080/v1"
gemini -p "Your prompt here"
```
*The proxy will automatically rewrite `/v1` to `/v1beta` as required by the Google Gemini API.*

---

## 3. Configuring Antigravity Framework
If Antigravity is operating as a background daemon or Node.js server, you must pass the proxy URL to its initialization script or `.env` file.

**Option A: Environment File (`.env`)**
If Antigravity respects standard environment variables, add the following to its `.env` file:
```env
# For OpenAI-compatible endpoints
OPENAI_API_BASE="http://127.0.0.1:8080/v1"

# For Anthropic-compatible endpoints
ANTHROPIC_BASE_URL="http://127.0.0.1:8080/v1"
```

**Option B: CLI Execution**
If launching Antigravity via command line:
```bash
OPENAI_API_BASE="http://127.0.0.1:8080/v1" npm run start:antigravity
```

---

## 4. Configuring Claude Code (For completeness)
Though you are not actively using it, if a Claude Code worker is ever deployed, it is routed similarly:

**macOS/Linux:**
```bash
export ANTHROPIC_BASE_URL="http://127.0.0.1:8080/v1"
claude
```

## 5. Verification
Once configured and executed, check the AutoOrch Dashboard at `http://localhost:3000`. You should see the agent appear in the **Active Fleet** matrix and its intercepted tool calls stream in the **Interceptions** tab.

## Viewing Delegated Task Sessions

Delegated tasks are hosted by the proxy and exposed over a shared terminal WebSocket. That means you can observe the same task from multiple surfaces:

- **Dashboard terminal surface**: attach through the dashboard task terminal UI when available in your dashboard checkout.
- **Current Antigravity shell**: attach inline without opening a new OS terminal:

```powershell
.\attach-task.ps1 <taskId>
```

This attach flow reuses the existing delegated session. It does not spawn a second worker.
