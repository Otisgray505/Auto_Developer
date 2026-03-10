---
trigger: always_on
---

# GEMINI.md - Antigravity Kit & Gemini CLI Configuration

> This file defines how the Antigravity Orchestrator and Gemini CLI behave specifically within the **Auto_Developer (Autonomous CLI Orchestration)** workspace.

---

## 1. PROJECT CONTEXT & ARCHITECTURE

**Project:** Autonomous CLI Orchestration Gateway
**Goal:** Act as a Zero-Trust Supervisor that intercepts, logs, validates, and routes local LLM CLI traffic to the original upstream providers via a local HTTP Reverse Proxy.

### Core Components
- **Backend (apps/proxy):** Express server bound to `127.0.0.1:8080`. Uses `http-proxy-middleware` and `zod` validation to route requests (GPT to OpenAI, Claude to Anthropic, Gemini to Google via `/v1beta`).
- **Frontend (apps/dashboard):** Next.js dashboard that visualizes the Winston telemetry logs emitted by the backend proxy.

## 2. GEMINI CLI & ORCHESTRATOR CONFIGURATION

When using Gemini CLI or Antigravity agents in this repository, you MUST follow these routing configurations:

### Proxy Routing Command (MANDATORY)
To ensure the Gemini CLI operates through the Supervisor Gateway, always inject the base URL environment variable *before* execution:
```powershell
$env:GEMINI_API_BASE_URL="http://127.0.0.1:8080/v1"
gemini -p "Prompt goes here"
```
*Note: The backend proxy will automatically rewrite the path from `/v1` to `/v1beta` for Gemini models.*

## 3. AGENTIC RULES & BEHAVIOR

### Workflow Protocol
1. **Parallel Execution:** Do not mix frontend (`apps/dashboard`) and backend (`apps/proxy`) development in the same thread. Launch separate agent threads (`@frontend-specialist` vs `@backend-specialist`) to maximize parallel throughput and maintain clean context windows.
2. **SDLC Adherence:** The project tracks state in `_bmad-output/implementation-artifacts/sprint-status.yaml`. Always consult this file to understand the current Epic and Story progress before modifying code.
3. **Artifact Generation:** After significant architectural changes, use the `/plan` or `task_boundary` tools to draft or update the corresponding markdown guides in the `.gemini/antigravity/brain` directory.

### Code Standards (Strict)
- **Validation:** Always use `zod` for payload validation on any new proxy endpoints.
- **Observability:** Use `winston` for logging. Do NOT use `console.log`. The dashboard relies on structured JSON logs containing `event`, `level`, and `route` keys.
- **Security:** Do not expose the proxy to `0.0.0.0`. It must strictly bind to localhost `127.0.0.1`.

## 4. COMMAND CHEAT SHEET

- **Start Proxy:** `npm run start` or `npx tsx src/index.ts` in `apps/proxy`
- **Run Proxy Tests:** `npm test` in `apps/proxy` (executes native `node:test`)
- **Check Sprint Status:** `cat _bmad-output/implementation-artifacts/sprint-status.yaml`
