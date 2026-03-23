/**
 * Shared CLI output helpers.
 * Centralizes chalk colors and ora spinners so command handlers
 * don't each import and configure them independently.
 */

import chalk from 'chalk';
import ora, { Ora } from 'ora';

// ── Color tokens ──────────────────────────────────────────────

export const c = {
    success: (s: string) => chalk.green(s),
    error: (s: string) => chalk.red(s),
    warn: (s: string) => chalk.yellow(s),
    info: (s: string) => chalk.cyan(s),
    muted: (s: string) => chalk.gray(s),
    bold: (s: string) => chalk.bold(s),
    highlight: (s: string) => chalk.bold.white(s),
    branch: (s: string) => chalk.magenta(s),
    id: (s: string) => chalk.dim(s),
} as const;

// ── Output helpers ────────────────────────────────────────────

export function ok(message: string): void {
    console.log(`${c.success('✓')} ${message}`);
}

export function fail(message: string): void {
    console.error(`${c.error('✗')} ${message}`);
}

export function warn(message: string): void {
    console.warn(`${c.warn('⚠')} ${message}`);
}

export function info(message: string): void {
    console.log(`${c.info('ℹ')} ${message}`);
}

export function label(key: string, value: string): void {
    console.log(`  ${c.muted(key + ':')} ${value}`);
}

// ── Spinner helpers ───────────────────────────────────────────

/**
 * Run `fn` while showing an ora spinner.
 * Automatically succeeds or fails the spinner based on outcome.
 */
export async function withSpinner<T>(text: string, fn: () => Promise<T>): Promise<T> {
    const spinner: Ora = ora({ text, color: 'cyan' }).start();
    try {
        const result = await fn();
        spinner.succeed(c.success(text));
        return result;
    } catch (err: any) {
        spinner.fail(c.error(text + ' — ' + err.message));
        throw err;
    }
}

/**
 * Create a managed spinner for multi-step operations.
 * Caller is responsible for calling `.succeed()` / `.fail()`.
 */
export function spinner(text: string): Ora {
    return ora({ text, color: 'cyan' }).start();
}

// ── Random command tips ────────────────────────────────────────

const TIPS_BY_COMMAND: Record<string, string[]> = {
    'commit memory':   ['Try `aigit query` to search what you just saved.', 'Run `aigit docs` to regenerate ARCHITECTURE.md.'],
    'commit decision': ['Use `aigit query` to find this decision later.', 'Run `aigit docs` to see it in your architecture graph.'],
    'commit task':     ['Fill in .aigit/tasks/{slug}.md with your sub-tasks.', 'Run `aigit handoff <slug>` to pass context to Agent B.'],
    'commit auto':     ['Run `aigit sync` to push your memory to ARCHITECTURE.md.'],
    'update task':     ['Run `aigit handoff <slug>` to hand off to the next agent.', 'Run `aigit docs` to see task status in ARCHITECTURE.md.'],
    'handoff':         ['Agent B should call `get_active_task_state` via MCP first.', 'Paste the block above into Agent B\'s first message.'],
    'init':            ['Next: add the MCP config to Claude Desktop or Cursor.', 'Try `aigit commit task "My First Feature"` to start tracking work.'],
    'query':           ['Use `aigit docs` to see the full memory graph.', 'Try `aigit commit memory` to add more context.'],
    'sync':            ['Run `aigit docs` to regenerate ARCHITECTURE.md after syncing.'],
    'heal':            ['Run `aigit sync` after healing to propagate fixes.'],
    'docs':            ['Open ARCHITECTURE.md to review your semantic graph.', 'Share with team via git — everyone gets up-to-date architecture docs.'],
    'status':          ['Use `aigit handoff <slug>` to generate a context block for any active task.'],
    'conflicts':       ['Run `aigit sync` to resolve and propagate after fixing conflicts.'],
};

const GLOBAL_TIPS: string[] = [
    'Run `aigit --help` to see all available commands.',
    'Use `aigit query "<question>"` to search your semantic memory.',
    'Use `aigit handoff <slug>` to generate an agent context block for any task.',
    'Run `aigit docs` to regenerate ARCHITECTURE.md from all memories.',
    'Use `aigit commit memory "..."` to save any architectural insight.',
    'Try `aigit status` to see all active tasks on this branch.',
    'Use `aigit mcp --profile core` to expose only core tools to your agent.',
    'Run `aigit init` in a new project to set up semantic memory in seconds.',
];

/** Show a random contextual tip after a successful command. Fires ~70% of the time. */
export function showTip(commandName?: string): void {
    if (Math.random() > 0.70) return;
    const pool = commandName && TIPS_BY_COMMAND[commandName]
        ? TIPS_BY_COMMAND[commandName]
        : GLOBAL_TIPS;
    const tip = pool[Math.floor(Math.random() * pool.length)];
    console.log(`\n${c.muted('💡 Tip:')} ${c.muted(tip)}`);
}

