import crypto from 'node:crypto';
import { DelegatedSession, SessionStatus } from './delegated-session-manager';

export type TaskStatus = 'pending' | 'running' | 'done' | 'failed';

export interface TaskSessionView {
    sessionId: string | null;
    transport: 'pty' | null;
    interactive: boolean;
    attachable: boolean;
    observers: number;
    status: SessionStatus;
}

export interface TaskRecord {
    id: string;
    input: string;
    command: string;
    args: string[];
    status: TaskStatus;
    createdAt: string;
    updatedAt: string;
    session: TaskSessionView;
    exitCode?: number;
    error?: string;
}

const DEFAULT_SESSION: TaskSessionView = {
    sessionId: null,
    transport: null,
    interactive: false,
    attachable: false,
    observers: 0,
    status: 'idle'
};

export class TaskStore {
    private readonly tasks = new Map<string, TaskRecord>();

    createTask(input: string): TaskRecord {
        const trimmed = input.trim();
        const command = detectCommand(trimmed);
        const now = new Date().toISOString();
        const args = ['-p', trimmed];

        const task: TaskRecord = {
            id: crypto.randomUUID(),
            input: trimmed,
            command,
            args,
            status: 'pending',
            createdAt: now,
            updatedAt: now,
            session: { ...DEFAULT_SESSION }
        };

        this.tasks.set(task.id, task);
        return task;
    }

    getTask(taskId: string): TaskRecord | undefined {
        return this.tasks.get(taskId);
    }

    getAllTasks(): TaskRecord[] {
        return Array.from(this.tasks.values()).sort((left, right) => right.createdAt.localeCompare(left.createdAt));
    }

    markDispatched(taskId: string, session: DelegatedSession): TaskRecord {
        const task = this.requireTask(taskId);
        task.status = 'running';
        task.updatedAt = new Date().toISOString();
        task.session = toSessionView(session);
        return task;
    }

    syncSession(taskId: string, session: DelegatedSession): TaskRecord {
        const task = this.requireTask(taskId);
        task.session = toSessionView(session);
        if (session.status === 'completed') {
            task.status = 'done';
            task.exitCode = session.exitCode;
        } else if (session.status === 'failed') {
            task.status = 'failed';
            task.exitCode = session.exitCode;
            task.error = `Delegated session exited with code ${session.exitCode ?? 1}`;
        }
        task.updatedAt = new Date().toISOString();
        return task;
    }

    failTask(taskId: string, error: string): TaskRecord {
        const task = this.requireTask(taskId);
        task.status = 'failed';
        task.error = error;
        task.updatedAt = new Date().toISOString();
        return task;
    }

    private requireTask(taskId: string): TaskRecord {
        const task = this.tasks.get(taskId);
        if (!task) {
            throw new Error(`Task not found: ${taskId}`);
        }
        return task;
    }
}

function toSessionView(session: DelegatedSession): TaskSessionView {
    return {
        sessionId: session.sessionId,
        transport: session.transport,
        interactive: session.interactive,
        attachable: session.attachable,
        observers: session.observers,
        status: session.status
    };
}

function detectCommand(input: string): string {
    const lower = input.toLowerCase();
    if (lower.includes('codex') || lower.includes('openai') || lower.includes('gpt')) return 'codex';
    if (lower.includes('claude') || lower.includes('anthropic')) return 'claude';
    return 'gemini';
}
