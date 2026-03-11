# Auto_Developer Complete Usage Guide

## 1. What This Product Is

Auto_Developer is a local orchestration stack with two runtime apps:

- `apps/proxy`: Node/Express reverse proxy + orchestration API + WebSocket streams + local SSH backend.
- `apps/dashboard`: Next.js dashboard for fleet, tasks, live logs, and analytics.

Core behavior:

- Intercepts `/v1` LLM calls, applies governance/rate limits, and forwards to model providers.
- Orchestrates task creation/dispatch/termination.
- Streams logs/fleet/terminal updates over WebSocket.

## 2. Runtime Topology

Default ports:

- Dashboard: `3000`
- Proxy API + WebSockets: `8080`
- SSH backend: `2222`

Default bind addresses:

- Proxy HTTP/WebSocket: `127.0.0.1` (localhost only)
- SSH backend: `127.0.0.1` (localhost only)
- Next.js dev server: default hostname is `0.0.0.0` (can accept LAN connections, firewall permitting)

## 3. Prerequisites

- Node.js 18+ (Node 20+ recommended)
- `npm`
- PowerShell (for convenience scripts)

## 4. Install

Run once:

```powershell
cd apps/proxy
npm install

cd ../dashboard
npm install
```

## 5. Start and Stop

### Option A: Start Everything

From repo root:

```powershell
.\start-all.ps1
```

This starts:

- Proxy (`npm run start`) in `apps/proxy`
- Dashboard (`npm run dev`) in `apps/dashboard`

Stop:

```powershell
.\stop-all.ps1
```

### Option B: Start Manually

Terminal 1:

```powershell
cd apps/proxy
npm run start
```

Terminal 2:

```powershell
cd apps/dashboard
npm run dev
```

## 6. Access URLs (Default Local Setup)

Use these first:

- Dashboard: `http://localhost:3000` (or `http://127.0.0.1:3000`)
- Proxy health: `http://127.0.0.1:8080/health`
- Proxy stats: `http://127.0.0.1:8080/api/stats`
- Logs WebSocket: `ws://127.0.0.1:8080/ws/logs`
- Fleet WebSocket: `ws://127.0.0.1:8080/ws/fleet`
- Terminal WebSocket (per task): `ws://127.0.0.1:8080/ws/terminal/{taskId}`
- SSH backend: `127.0.0.1:2222`

## 7. Dashboard Workflow

1. Open `http://localhost:3000`.
2. Use the top command bar to submit a task.
3. The dashboard creates task (`POST /api/tasks`) and auto-dispatches it (`POST /api/tasks/{id}/dispatch`).
4. Track progress in:
   - `Task Pipeline`
   - `Working Node Matrix`
   - `Interceptions` (live proxy logs)
   - `Fleet Analytics`
5. Optional: open interactive terminal for running tasks.

## 8. Route External CLI Traffic Through Proxy

In the terminal where you run your agent CLI:

```powershell
$env:OPENAI_API_BASE="http://127.0.0.1:8080/v1"
$env:ANTHROPIC_BASE_URL="http://127.0.0.1:8080/v1"
$env:GEMINI_API_BASE_URL="http://127.0.0.1:8080/v1"
```

Then run your CLI (examples):

```powershell
codex
claude
gemini -p "your prompt"
```

## 9. API Surface (Operational)

- `POST /v1/*` proxy/interception entrypoint
- `POST /api/tasks` create task
- `GET /api/tasks` list tasks
- `GET /api/tasks/:id` task details
- `POST /api/tasks/:id/dispatch` dispatch task
- `POST /api/tasks/:id/terminate` terminate task
- `GET /api/fleet` current fleet state
- `GET /api/stats` live metrics
- `GET /health` service health snapshot

## 10. Localhost vs Local Network

### Localhost

- Means the same machine only.
- Uses loopback addresses (`localhost`, `127.0.0.1`, `::1`).
- Most secure default for dev.

### Local Network (LAN)

- Means other devices on your Wi-Fi/LAN reach your machine IP (for example `192.168.4.23`).
- Requires services to bind on LAN-reachable interfaces, plus firewall allowance.

Current project behavior:

- Dashboard can be LAN-reachable (Next dev default host `0.0.0.0`).
- Proxy and SSH are **not** LAN-reachable by default because they explicitly bind to `127.0.0.1`.
- If dashboard is opened from another device, it will try to call `http://<dashboard-host>:8080` for backend. This fails unless proxy bind policy is changed.

## 11. 127.0.0.1 vs 127.0.1.0 (Important)

- Use `127.0.0.1` (or `localhost`) for dashboard/proxy access on this machine.
- Do **not** use `127.0.1.0` for the dashboard.

Why:

- `127.0.0.1` is the standard loopback host.
- `127.0.1.0` is not the standard host endpoint and is typically treated as a network address in many contexts.

## 12. Available URL Connection Instances

For this machine right now, usable address instances are:

### Loopback (same machine only)

- `http://localhost:3000`
- `http://127.0.0.1:3000`
- `http://localhost:8080`
- `http://127.0.0.1:8080`
- `ws://127.0.0.1:8080/ws/logs`
- `ws://127.0.0.1:8080/ws/fleet`
- `ws://127.0.0.1:8080/ws/terminal/{taskId}`

### LAN candidate on this host (Wi-Fi)

- IPv4: `192.168.4.23`
- Dashboard LAN URL (likely reachable): `http://192.168.4.23:3000`
- Proxy LAN URL (currently **not reachable by design**): `http://192.168.4.23:8080`

### WSL virtual adapter candidate

- Host adapter: `172.24.112.1`
- Typically internal/virtual routing, not a normal LAN access target.

### Cloudflare quick tunnel (ephemeral, optional)

- Start with:
  - `cd apps/proxy`
  - `npm run tunnel`
- You get a temporary `https://<random>.trycloudflare.com` URL for exposed port target.

## 13. If You Need LAN Access for Full Dashboard + Backend

You must change proxy bind host from `127.0.0.1` to `0.0.0.0` (or a specific LAN IP) for:

- HTTP server listener
- SSH listener

Then ensure firewall allows inbound ports `8080` (and optionally `2222`), and open dashboard via the machine LAN IP.

## 14. Known Networking Caveat

Dashboard uses one variable `NEXT_PUBLIC_WS_URL` in multiple components (logs and fleet). If you set it to one explicit path, one stream can break. For default behavior, leave `NEXT_PUBLIC_WS_URL` unset and rely on host-derived defaults.

## 15. Troubleshooting Quick Checks

- Dashboard shows offline:
  - Verify proxy is running on `127.0.0.1:8080`
  - Check `http://127.0.0.1:8080/health`
- No live logs:
  - Check WebSocket URL `ws://127.0.0.1:8080/ws/logs`
- Tasks created but not progressing:
  - Ensure CLI binary exists (`gemini`, `codex`, or `claude`) and is callable by the proxy process.
- Port conflicts:
  - Run `.\stop-all.ps1`, then restart.
