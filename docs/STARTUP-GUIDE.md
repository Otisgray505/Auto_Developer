# Auto_Developer: Start-Up & Usage Guide

## Prerequisites
- **Node.js**: v18+ (required for Next.js 16 and Express)
- **PowerShell**: Required for the centralized start script
- **Package Manager**: `npm`

## 🚀 1. Quick Start (Centralized Command)
The easiest way to start the Auto_Developer platform infrastructure is using the centralized PowerShell script.

From the project root, run:
```powershell
.\start-all.ps1
```
*This command starts the Proxy on Port 8080 and attempts to start the Dashboard on Port 3000 as background jobs. It does not launch Gemini CLI, Codex, Claude, or Antigravity for you.*

**Managing Background Jobs:**
- To view running jobs: `Get-Job`
- To view logs from the servers: `Receive-Job -Name "AutoOrchProxy" -Keep`
- To stop the system cleanly: `.\stop-all.ps1`

## 🛠️ 2. Manual Start (Individual Components)

If you prefer to run the components in separate terminal tabs for real-time log monitoring:

**Start the Backend Proxy (Port 8080 & SSH Port 2222):**
```bash
cd apps/proxy
npm run start
# Alternatively: npx tsx src/index.ts
```

**Start the Fleet Dashboard (Port 3000):**
```bash
cd apps/dashboard
npm run dev
```

## 🧠 3. Usage: Routing AI CLI Traffic

To route your Gemini CLI (or other AI agents) through the Zero-Trust Supervisor, you **must** inject the proxy environment variable before running your agent commands.

**For Gemini CLI:**
```powershell
$env:GEMINI_API_BASE_URL="http://127.0.0.1:8080/v1"
gemini -p "Your prompt here"
```
*Note: The proxy will automatically rewrite the path to `/v1beta` for Gemini models, enforce token budgets, and stream the telemetry logs to your dashboard.*

**For Codex / OpenAI-compatible CLIs:**
```powershell
$env:OPENAI_API_BASE="http://127.0.0.1:8080/v1"
codex
```

**For Claude / Anthropic-compatible CLIs:**
```powershell
$env:ANTHROPIC_BASE_URL="http://127.0.0.1:8080/v1"
claude
```

## 🖥️ 4. Viewing Delegated Sessions

Delegated tasks run as backend-managed sessions. They do **not** automatically open as a new OS terminal window, and they do **not** replace your current Antigravity shell automatically.

You now have two monitoring paths:

1. **Dashboard Terminal**
   - Open the dashboard and connect to the delegated task terminal via the task's session stream.
2. **Current Antigravity / PowerShell Terminal**
   - Attach to the same delegated session inline:
   ```powershell
   .\attach-task.ps1 <taskId>
   ```
   - This mirrors live output and forwards your keystrokes back to the running delegated CLI.

## 🌐 5. Remote Access (Zero-Trust)
The proxy includes Cloudflare Quick Tunnels for remote operability. When the proxy starts, check the startup logs for the ephemeral `trycloudflare.com` URL to access your agent environment remotely. 
