"use strict";
/**
 * Shared CLI output helpers.
 * Centralizes chalk colors and ora spinners so command handlers
 * don't each import and configure them independently.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.c = void 0;
exports.ok = ok;
exports.fail = fail;
exports.warn = warn;
exports.info = info;
exports.label = label;
exports.withSpinner = withSpinner;
exports.spinner = spinner;
exports.showTip = showTip;
const chalk_1 = __importDefault(require("chalk"));
const ora_1 = __importDefault(require("ora"));
// ── Color tokens ──────────────────────────────────────────────
exports.c = {
    success: (s) => chalk_1.default.green(s),
    error: (s) => chalk_1.default.red(s),
    warn: (s) => chalk_1.default.yellow(s),
    info: (s) => chalk_1.default.cyan(s),
    muted: (s) => chalk_1.default.gray(s),
    bold: (s) => chalk_1.default.bold(s),
    highlight: (s) => chalk_1.default.bold.white(s),
    branch: (s) => chalk_1.default.magenta(s),
    id: (s) => chalk_1.default.dim(s),
};
// ── Output helpers ────────────────────────────────────────────
function ok(message) {
    console.log(`${exports.c.success('✓')} ${message}`);
}
function fail(message) {
    console.error(`${exports.c.error('✗')} ${message}`);
}
function warn(message) {
    console.warn(`${exports.c.warn('⚠')} ${message}`);
}
function info(message) {
    console.log(`${exports.c.info('ℹ')} ${message}`);
}
function label(key, value) {
    console.log(`  ${exports.c.muted(key + ':')} ${value}`);
}
// ── Spinner helpers ───────────────────────────────────────────
/**
 * Run `fn` while showing an ora spinner.
 * Automatically succeeds or fails the spinner based on outcome.
 */
async function withSpinner(text, fn) {
    const spinner = (0, ora_1.default)({ text, color: 'cyan' }).start();
    try {
        const result = await fn();
        spinner.succeed(exports.c.success(text));
        return result;
    }
    catch (err) {
        spinner.fail(exports.c.error(text + ' — ' + err.message));
        throw err;
    }
}
/**
 * Create a managed spinner for multi-step operations.
 * Caller is responsible for calling `.succeed()` / `.fail()`.
 */
function spinner(text) {
    return (0, ora_1.default)({ text, color: 'cyan' }).start();
}
// ── Random command tips ────────────────────────────────────────
const TIPS_BY_COMMAND = {
    'commit memory': ['Try `aigit query` to search what you just saved.', 'Run `aigit docs` to regenerate ARCHITECTURE.md.'],
    'commit decision': ['Use `aigit query` to find this decision later.', 'Run `aigit docs` to see it in your architecture graph.'],
    'commit task': ['Fill in .aigit/tasks/{slug}.md with your sub-tasks.', 'Run `aigit handoff <slug>` to pass context to Agent B.'],
    'commit auto': ['Run `aigit sync` to push your memory to ARCHITECTURE.md.'],
    'update task': ['Run `aigit handoff <slug>` to hand off to the next agent.', 'Run `aigit docs` to see task status in ARCHITECTURE.md.'],
    'handoff': ['Agent B should call `get_active_task_state` via MCP first.', 'Paste the block above into Agent B\'s first message.'],
    'init': ['Next: add the MCP config to Claude Desktop or Cursor.', 'Try `aigit commit task "My First Feature"` to start tracking work.'],
    'query': ['Use `aigit docs` to see the full memory graph.', 'Try `aigit commit memory` to add more context.'],
    'sync': ['Run `aigit docs` to regenerate ARCHITECTURE.md after syncing.'],
    'heal': ['Run `aigit sync` after healing to propagate fixes.'],
    'docs': ['Open ARCHITECTURE.md to review your semantic graph.', 'Share with team via git — everyone gets up-to-date architecture docs.'],
    'status': ['Use `aigit handoff <slug>` to generate a context block for any active task.'],
    'conflicts': ['Run `aigit sync` to resolve and propagate after fixing conflicts.'],
};
const GLOBAL_TIPS = [
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
function showTip(commandName) {
    if (Math.random() > 0.70)
        return;
    const pool = commandName && TIPS_BY_COMMAND[commandName]
        ? TIPS_BY_COMMAND[commandName]
        : GLOBAL_TIPS;
    const tip = pool[Math.floor(Math.random() * pool.length)];
    console.log(`\n${exports.c.muted('💡 Tip:')} ${exports.c.muted(tip)}`);
}
