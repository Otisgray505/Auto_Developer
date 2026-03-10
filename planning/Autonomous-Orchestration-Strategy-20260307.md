# Autonomous AI Orchestration Strategy: Supervisor-Worker Swarm Model

This document outlines the architectural strategy for achieving a fully autonomous, bidirectional orchestration system where **Antigravity (Gemini CLI)** acts as the master supervisor and **OpenClaw (Claude Code)** instances act as autonomous workers.

## 🏗️ Core Architecture

To achieve zero-human-interaction, we leverage the file system and terminal multiplexers (`tmux`) as the primary communication bridge.

### 1. The Master Orchestrator (Antigravity)
The top-level supervisor responsible for:
*   **Decomposition:** Breaking high-level goals into discrete, atomic tasks.
*   **Dispatch:** Placing task files into a specialized queue directory.
*   **Real-time Monitoring:** Polling worker terminal states via `tmux capture-pane`.
*   **Verification:** Validating worker outputs against the master plan.
*   **Error Handling:** Injecting corrective instructions or "yes/no" responses into worker terminals.

### 2. The Worker Engine (OpenClaw via Tmux)
Based on the `openclaw-worker` pattern found in the workspace:
*   **Headless Execution:** Claude Code runs inside background `tmux` sessions.
*   **Task Watcher:** A background daemon monitors `./task-queue/`.
*   **Automatic Boot:** Detection of a new `.md` task file triggers a `tmux new-session` command running `claude -p [task_file]`.

### 3. Bidirectional Communication Protocol

| Direction | Mechanism | Action |
| :--- | :--- | :--- |
| **Supervisor → Worker** | File System | `write_file("./task-queue/task-01.md")` |
| **Supervisor → Worker** | Terminal Injection | `tmux send-keys -t worker "yes" C-m` |
| **Worker → Supervisor** | Live Feedback | `tmux capture-pane -p -t worker` |
| **Worker → Supervisor** | Completion | `write_file("./task-results/task-01-done.json")` |

## 🔄 The Autonomous Execution Loop

1.  **Goal Input:** User provides a broad directive to Antigravity.
2.  **Planning:** Antigravity generates a multi-step execution roadmap in `plans/`.
3.  **Deployment:** Antigravity drops the first task into `/task-queue/`.
4.  **Worker Activation:** The `task-watcher.js` daemon detects the file and starts a `tmux` session for Claude Code.
5.  **Supervision:** Antigravity periodically runs `run_shell_command("tmux capture-pane ...")` to analyze progress. If the worker is stuck on a prompt, Antigravity identifies the question and sends the appropriate keys.
6.  **Validation:** Upon task completion, Antigravity reads the changed files and the worker's status report.
7.  **Iteration:** Antigravity dispatches the next task in the sequence until the project goal is reached.

## 🛠️ Required Infrastructure

1.  **Directories:**
    *   `task-queue/`: Active tasks waiting for workers.
    *   `task-results/`: JSON reports from completed tasks.
    *   `worker-logs/`: Persistent terminal logs for debugging.
2.  **Scripts:**
    *   `orchestrator-watch.py`: A script for Antigravity to poll `tmux` states.
    *   `worker-daemon.js`: The existing or adapted `task-watcher.js` to manage the lifecycle of Claude Code sessions.

## 🎯 Target Outcome
A system where the user sets a project objective, and two or more AI agents collaborate autonomously to build, test, and verify the entire solution, requiring human intervention only for final approval or high-level pivots.
