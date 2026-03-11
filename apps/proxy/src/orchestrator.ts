import { EventEmitter } from 'node:events';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { logger } from './logger';

const DATA_DIR = path.join(process.cwd(), '.data');
const TASKS_FILE = path.join(DATA_DIR, 'tasks.json');

// Task complexity modes
export type TaskMode = 'fast' | 'planned';
export type TaskStatus = 'pending' | 'analyzing' | 'planned' | 'dispatching' | 'running' | 'done' | 'failed';

export interface TaskStep {
    id: string;
    order: number;
    description: string;
    status: 'pending' | 'running' | 'done' | 'failed';
    assignedAgent?: string;
    startedAt?: string;
    completedAt?: string;
}

export interface Task {
    id: string;
    command: string;
    rawInput: string;
    mode: TaskMode;
    status: TaskStatus;
    steps: TaskStep[];
    complexity: number; // 1-10
    assignedAgent?: string;
    result?: string;
    error?: string;
    createdAt: string;
    updatedAt: string;
    completedAt?: string;
    analysis?: string;
}

// Simple heuristics for complexity analysis
const COMPLEX_KEYWORDS = [
    'build', 'create', 'implement', 'refactor', 'design', 'architect',
    'migrate', 'deploy', 'integrate', 'orchestrate', 'full-stack',
    'multi-step', 'setup', 'configure', 'optimize', 'debug complex'
];

const SIMPLE_KEYWORDS = [
    'fix', 'update', 'change', 'rename', 'add', 'remove', 'delete',
    'check', 'test', 'run', 'list', 'show', 'explain', 'what is'
];

function analyzeComplexity(input: string): { mode: TaskMode; complexity: number; analysis: string } {
    const lower = input.toLowerCase();
    const words = lower.split(/\s+/);

    let complexScore = 0;
    let simpleScore = 0;
    const reasons: string[] = [];

    // Keyword scoring
    for (const kw of COMPLEX_KEYWORDS) {
        if (lower.includes(kw)) {
            complexScore += 2;
            reasons.push(`Complex keyword detected: "${kw}"`);
        }
    }
    for (const kw of SIMPLE_KEYWORDS) {
        if (lower.includes(kw)) {
            simpleScore += 2;
            reasons.push(`Simple keyword detected: "${kw}"`);
        }
    }

    // Length scoring — longer prompts tend to be more complex
    if (words.length > 30) {
        complexScore += 3;
        reasons.push(`Long prompt (${words.length} words) suggests complexity`);
    } else if (words.length > 15) {
        complexScore += 1;
        reasons.push(`Medium prompt (${words.length} words)`);
    }

    // Multi-file references
    const fileRefs = (lower.match(/\.(ts|tsx|js|jsx|json|css|md|py|rs)/g) || []).length;
    if (fileRefs > 2) {
        complexScore += 2;
        reasons.push(`Multiple file references (${fileRefs}) suggest multi-file operation`);
    }

    // Compute final complexity (1-10)
    const raw = Math.max(1, Math.min(10, complexScore - simpleScore + 5));
    const mode: TaskMode = raw >= 6 ? 'planned' : 'fast';

    const analysis = [
        `Complexity Score: ${raw}/10`,
        `Mode: ${mode.toUpperCase()}`,
        '',
        'Analysis:',
        ...reasons.map(r => `  • ${r}`)
    ].join('\n');

    return { mode, complexity: raw, analysis };
}

function generateBreakdown(input: string, mode: TaskMode): TaskStep[] {
    if (mode === 'fast') {
        return [{
            id: crypto.randomUUID(),
            order: 1,
            description: `Execute: ${input.substring(0, 100)}`,
            status: 'pending'
        }];
    }

    // Planned mode: break into structured steps
    const steps: TaskStep[] = [
        {
            id: crypto.randomUUID(),
            order: 1,
            description: 'Analyze requirements and scope',
            status: 'pending'
        },
        {
            id: crypto.randomUUID(),
            order: 2,
            description: 'Identify target files and dependencies',
            status: 'pending'
        },
        {
            id: crypto.randomUUID(),
            order: 3,
            description: `Plan implementation for: ${input.substring(0, 80)}`,
            status: 'pending'
        },
        {
            id: crypto.randomUUID(),
            order: 4,
            description: 'Execute implementation changes',
            status: 'pending'
        },
        {
            id: crypto.randomUUID(),
            order: 5,
            description: 'Validate and verify changes',
            status: 'pending'
        }
    ];

    return steps;
}

export class Orchestrator extends EventEmitter {
    private tasks: Map<string, Task> = new Map();
    private initialized: boolean = false;

    constructor() {
        super();
        this.loadTasks().catch(err => {
            logger.error('Failed to load tasks from disk:', err);
        });
    }

    private async loadTasks() {
        try {
            if (!fs.existsSync(DATA_DIR)) {
                await fs.promises.mkdir(DATA_DIR, { recursive: true });
            }
            if (fs.existsSync(TASKS_FILE)) {
                const data = await fs.promises.readFile(TASKS_FILE, 'utf-8');
                const parsed = JSON.parse(data);
                if (Array.isArray(parsed)) {
                    parsed.forEach((t: Task) => this.tasks.set(t.id, t));
                }
            }
        } catch (error) {
            logger.error('Error loading tasks:', error);
        }
        this.initialized = true;
    }

    private async saveTasks() {
        if (!this.initialized) return;
        try {
            if (!fs.existsSync(DATA_DIR)) {
                await fs.promises.mkdir(DATA_DIR, { recursive: true });
            }
            const data = Array.from(this.tasks.values());
            await fs.promises.writeFile(TASKS_FILE, JSON.stringify(data, null, 2), 'utf-8');
        } catch (error) {
            logger.error('Error saving tasks:', error);
        }
    }

    public createTask(rawInput: string): Task {
        const { mode, complexity, analysis } = analyzeComplexity(rawInput);
        const steps = generateBreakdown(rawInput, mode);

        // Determine the CLI command from the input
        const command = this.detectCommand(rawInput);

        const task: Task = {
            id: crypto.randomUUID(),
            command,
            rawInput,
            mode,
            status: 'pending',
            steps,
            complexity,
            analysis,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        this.tasks.set(task.id, task);

        logger.info('Orchestrator: Task created', {
            event: 'orchestrator_task_created',
            taskId: task.id,
            mode,
            complexity,
            steps: steps.length
        });

        this.emit('task_created', task);
        this.saveTasks();
        return task;
    }

    public async analyzeTask(taskId: string): Promise<Task | null> {
        const task = this.tasks.get(taskId);
        if (!task) return null;

        task.status = 'analyzing';
        task.updatedAt = new Date().toISOString();
        this.emit('task_updated', task);

        // Simulate analysis time (in production this would call an LLM)
        await new Promise(resolve => setTimeout(resolve, 500));

        task.status = 'planned';
        task.updatedAt = new Date().toISOString();
        this.emit('task_updated', task);

        logger.info('Orchestrator: Task analysis complete', {
            event: 'orchestrator_task_analyzed',
            taskId,
            mode: task.mode
        });

        this.saveTasks();
        return task;
    }

    public async dispatchTask(taskId: string, agentId?: string): Promise<Task | null> {
        const task = this.tasks.get(taskId);
        if (!task) return null;

        task.status = 'dispatching';
        task.assignedAgent = agentId;
        task.updatedAt = new Date().toISOString();
        this.emit('task_updated', task);

        // Mark first step as running
        if (task.steps.length > 0) {
            task.steps[0].status = 'running';
            task.steps[0].startedAt = new Date().toISOString();
            task.steps[0].assignedAgent = agentId;
        }

        task.status = 'running';
        task.updatedAt = new Date().toISOString();
        this.emit('task_updated', task);

        logger.info('Orchestrator: Task dispatched', {
            event: 'orchestrator_task_dispatched',
            taskId,
            agentId: agentId || 'unassigned'
        });

        this.saveTasks();
        return task;
    }

    public completeTaskStep(taskId: string, stepId: string): Task | null {
        const task = this.tasks.get(taskId);
        if (!task) return null;

        const step = task.steps.find(s => s.id === stepId);
        if (step) {
            step.status = 'done';
            step.completedAt = new Date().toISOString();
        }

        // Check if all steps done
        const allDone = task.steps.every(s => s.status === 'done');
        if (allDone) {
            task.status = 'done';
            task.completedAt = new Date().toISOString();
        } else {
            // Start next pending step
            const nextPending = task.steps.find(s => s.status === 'pending');
            if (nextPending) {
                nextPending.status = 'running';
                nextPending.startedAt = new Date().toISOString();
                nextPending.assignedAgent = task.assignedAgent;
            }
        }

        task.updatedAt = new Date().toISOString();
        this.emit('task_updated', task);
        this.saveTasks();
        return task;
    }

    public failTask(taskId: string, error: string): Task | null {
        const task = this.tasks.get(taskId);
        if (!task) return null;

        task.status = 'failed';
        task.error = error;
        task.updatedAt = new Date().toISOString();
        this.emit('task_updated', task);

        logger.warn('Orchestrator: Task failed', {
            event: 'orchestrator_task_failed', taskId, error
        });

        this.saveTasks();
        return task;
    }

    public getTask(taskId: string): Task | null {
        return this.tasks.get(taskId) || null;
    }

    public getAllTasks(): Task[] {
        return Array.from(this.tasks.values()).sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
    }

    public getActiveTasks(): Task[] {
        return this.getAllTasks().filter(t =>
            ['pending', 'analyzing', 'planned', 'dispatching', 'running'].includes(t.status)
        );
    }

    private detectCommand(input: string): string {
        const lower = input.toLowerCase();
        if (lower.includes('gemini') || lower.includes('google')) return 'gemini';
        if (lower.includes('claude') || lower.includes('anthropic')) return 'claude';
        if (lower.includes('codex') || lower.includes('openai') || lower.includes('gpt')) return 'codex';
        return 'gemini'; // Default to Gemini within the Antigravity ecosystem
    }
}
