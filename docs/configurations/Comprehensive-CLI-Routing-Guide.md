# Comprehensive Guide: Routing CLI Agents Through AutoOrch Supervisor

This guide provides extensive, step-by-step instructions on how to configure and route various AI CLI tools—specifically the **Gemini CLI** and the **Antigravity Framework**—so that their traffic is intercepted, governed, and logged by the local Zero-Trust Proxy Gateway.

---

## 🛑 Important Clarification: Who Runs These Commands?

**You (the User) must run these environment variable commands in your own terminal.**

When you tell me (the AI) to "set an environment variable," it only applies to the temporary, hidden sub-shell I use to run background tasks. It does **not** affect your terminal window. 

If you want to use the Gemini CLI or Antigravity on your computer and have it show up on the AutoOrch Dashboard, **you must open your terminal (e.g., PowerShell, Windows Terminal, iTerm) and paste the configuration commands below before you start the agent.**

---

## Phase 1: Start the Supervisor Proxy

Before any agent can be intercepted, the "Black Hole" (the local reverse proxy) must be running.

1. Open a new terminal window.
2. Navigate to the proxy application directory:
   ```bash
   cd apps/proxy
   ```
3. Install dependencies (if you haven't already):
   ```bash
   npm install
   ```
4. Start the server:
   ```bash
   npm run start
   ```
   *Leave this terminal window open. You should see a message indicating it is listening on `http://127.0.0.1:8080`.*

---

## Phase 2: Start the Dashboard (Optional but Recommended)

To see the live matrix and interceptions:
1. Open a **second** terminal window.
2. Navigate to the dashboard directory:
   ```bash
   cd apps/dashboard
   ```
3. Start the Next.js frontend:
   ```bash
   npm run dev
   ```
4. Open your browser to `http://localhost:3000`.

---

## Phase 3: Configuring the Agents

Now, open a **third** terminal window. This is where you will run your AI agents.

### Configuration A: The Gemini CLI
The Gemini CLI is a specific worker tool. By default, it talks directly to Google's servers. We must "trick" it into talking to our local proxy instead.

**If you are using Windows PowerShell:**
```powershell
# 1. Set the environment variable to point to the local proxy
$env:GEMINI_API_BASE_URL="http://127.0.0.1:8080/v1"

# 2. Run your Gemini CLI command in the same window
gemini -p "Write a python script to calculate fibonacci"
```

**If you are using Windows Command Prompt (CMD):**
```cmd
set GEMINI_API_BASE_URL=http://127.0.0.1:8080/v1
gemini -p "Write a python script to calculate fibonacci"
```

**If you are using macOS / Linux / Git Bash:**
```bash
export GEMINI_API_BASE_URL="http://127.0.0.1:8080/v1"
gemini -p "Write a python script to calculate fibonacci"
```

*What happens?* The Gemini CLI sends the request to `http://127.0.0.1:8080/v1`. The proxy logs it to the dashboard, rewrites the path to `/v1beta` (which Google requires), and forwards it securely.

---

### Configuration B: The Antigravity Framework
Antigravity is a higher-level orchestration framework. It may spawn multiple agents or act as a long-running daemon. Depending on how your specific version of Antigravity is built, it likely uses standard OpenAI or Anthropic SDKs under the hood.

**Method 1: Using a `.env` file (Recommended for persistent setups)**
Create or edit the `.env` file in your Antigravity project root:
```env
# Force OpenAI-compatible SDKs to use the local proxy
OPENAI_API_BASE="http://127.0.0.1:8080/v1"

# Force Anthropic SDKs to use the local proxy
ANTHROPIC_BASE_URL="http://127.0.0.1:8080/v1"

# If Antigravity uses the Gemini SDK internally
GEMINI_API_BASE_URL="http://127.0.0.1:8080/v1"
```

**Method 2: Inline Execution (PowerShell)**
If you are testing Antigravity and don't want to modify `.env` files:
```powershell
$env:OPENAI_API_BASE="http://127.0.0.1:8080/v1"
$env:ANTHROPIC_BASE_URL="http://127.0.0.1:8080/v1"
npm run start:antigravity  # Replace with your actual start command
```

---

## Phase 4: Validating the Integration

1. With the Proxy running (Terminal 1), the Dashboard running (Terminal 2), and your configured agent running (Terminal 3).
2. Look at the **Dashboard (http://localhost:3000)**.
3. Click the **"Active Fleet"** tab. You should see your agent's node appear dynamically via the WebSocket connection.
4. Click the **"Interceptions"** tab. You should see a live stream of the prompts you are sending through the CLI, flagged as `command` or `info`.

## Troubleshooting

- **Agent hangs or errors out:** Ensure the proxy (Terminal 1) is actually running and hasn't crashed.
- **Nothing appears on the dashboard:** Ensure your browser is connected to the WebSocket. Check the "Live Session Stream" header for the green "Connected" badge.
- **Commands go straight to the internet (bypassing dashboard):** You likely closed the terminal where you set the environment variable. Environment variables are **session-specific**. If you open a new terminal tab, you must run the `$env:GEMINI_API_BASE_URL=...` command again.

## Inline Attach for Antigravity

When the proxy delegates a task, the worker runs as a backend-managed session. It is not opened automatically as a new visible terminal window.

To inspect or control that worker from your current Antigravity or PowerShell session, attach to the task:

```powershell
.\attach-task.ps1 <taskId>
```

This connects your current terminal to the same delegated session the dashboard can observe.
