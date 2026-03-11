#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const Sentry = __importStar(require("@sentry/node"));
const os = __importStar(require("os"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
const posthog_node_1 = require("posthog-node");
const perf_hooks_1 = require("perf_hooks");
const commander_1 = require("commander");
const db_1 = require("../db");
const output_1 = require("./output");
// ── Version ────────────────────────────────────────────────────
let cliVersion = 'unknown';
try {
    const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '../../package.json'), 'utf-8'));
    cliVersion = pkg.version || 'unknown';
}
catch { /* ignore */ }
// ── Telemetry ──────────────────────────────────────────────────
const POSTHOG_KEY = process.env.AIGIT_POSTHOG_KEY || 'phc_vgRl0mE57cbfKhECqT55sep3xVwggbmUvM82YK9781Y';
const phClient = new posthog_node_1.PostHog(POSTHOG_KEY, { host: 'https://eu.i.posthog.com' });
const isTelemetryEnabled = process.env.DO_NOT_TRACK !== '1' && process.env.DO_NOT_TRACK !== 'true';
function getOrGenerateTelemetryId() {
    const configDir = path.join(os.homedir(), '.aigit');
    const configFile = path.join(configDir, 'telemetry.json');
    try {
        if (fs.existsSync(configFile)) {
            const data = JSON.parse(fs.readFileSync(configFile, 'utf-8'));
            if (data.distinctId)
                return data.distinctId;
        }
        else {
            if (!fs.existsSync(configDir))
                fs.mkdirSync(configDir, { recursive: true });
        }
        const distinctId = crypto.randomUUID();
        fs.writeFileSync(configFile, JSON.stringify({ distinctId }));
        return distinctId;
    }
    catch {
        return 'anonymous_cli_user_fallback';
    }
}
const TELEMETRY_ID = getOrGenerateTelemetryId();
if (isTelemetryEnabled) {
    phClient.identify({
        distinctId: TELEMETRY_ID,
        properties: { cli_version: cliVersion, node_version: process.version, os_platform: os.platform(), os_release: os.release() },
    });
}
// ── Sentry ─────────────────────────────────────────────────────
Sentry.init({
    dsn: process.env.AIGIT_SENTRY_DSN || 'https://b7b2bf74b578153299cf94bc66e89175@o4510993965907968.ingest.de.sentry.io/4510993978490960',
    tracesSampleRate: 1.0,
    beforeSend(event) {
        const workspacePath = (0, db_1.findWorkspaceRoot)(process.cwd());
        const scrubbedEvent = JSON.parse(JSON.stringify(event));
        const scrubString = (str) => str.split(workspacePath).join('[SECURE_WORKSPACE]');
        if (scrubbedEvent.exception?.values) {
            scrubbedEvent.exception.values.forEach((val) => {
                if (val.value)
                    val.value = scrubString(val.value);
                if (val.stacktrace?.frames) {
                    val.stacktrace.frames.forEach((frame) => {
                        if (frame.filename)
                            frame.filename = scrubString(frame.filename);
                        if (frame.abs_path)
                            frame.abs_path = scrubString(frame.abs_path);
                    });
                }
            });
        }
        return scrubbedEvent;
    },
});
if (isTelemetryEnabled)
    Sentry.setUser({ id: TELEMETRY_ID });
// ── Helpers ────────────────────────────────────────────────────
const startTime = perf_hooks_1.performance.now();
async function run(commandName, action) {
    await (0, db_1.initializeDatabase)();
    try {
        phClient.capture({
            distinctId: TELEMETRY_ID,
            event: 'cli_command_executed',
            properties: { command: commandName, cli_version: cliVersion, node_version: process.version, os_platform: os.platform() },
        });
    }
    catch { }
    try {
        await action();
        (0, output_1.showTip)(commandName);
        if (isTelemetryEnabled) {
            try {
                phClient.capture({
                    distinctId: TELEMETRY_ID,
                    event: 'cli_command_completed',
                    properties: { command: commandName, duration_ms: Math.round(perf_hooks_1.performance.now() - startTime) },
                });
            }
            catch { }
            await phClient.shutdown();
        }
    }
    catch (err) {
        if (isTelemetryEnabled) {
            try {
                phClient.capture({
                    distinctId: TELEMETRY_ID,
                    event: 'cli_command_failed',
                    properties: { command: commandName, error: err.message, duration_ms: Math.round(perf_hooks_1.performance.now() - startTime) },
                });
            }
            catch { }
            await phClient.shutdown();
        }
        console.error('aigit error:', err.message);
        process.exit(1);
    }
}
// ── Command handlers (lazy loaded to keep startup fast) ────────
function ws() {
    return (0, db_1.findWorkspaceRoot)(process.cwd());
}
// ── Commander program ──────────────────────────────────────────
const program = new commander_1.Command();
program
    .name('aigit')
    .description('The AI Context Engine for Git')
    .version(cliVersion, '-v, --version', 'Output the current version');
// ── init ─────────────────────────────────────────────────────
program
    .command('init')
    .description('Initialize aigit in the current repository (hooks + .aigit/)')
    .action(async () => {
    await run('init', async () => {
        const { default: handler } = await Promise.resolve().then(() => __importStar(require('./commands/init')));
        await handler({ args: [], workspacePath: ws(), command: 'init' });
    });
});
program
    .command('init-hook')
    .description('Install Git hooks only (no DB init or wizard)')
    .action(async () => {
    await run('init-hook', async () => {
        const { installGitHook } = await Promise.resolve().then(() => __importStar(require('./hooks')));
        installGitHook(ws());
        console.log('✅ Git hooks installed.');
    });
});
// ── hydrate ───────────────────────────────────────────────────
program
    .command('hydrate [file]')
    .description('Compile a branch-aware context prompt')
    .action(async (file) => {
    await run('hydrate', async () => {
        const { default: handler } = await Promise.resolve().then(() => __importStar(require('./commands/hydrate')));
        await handler({ args: file ? [file] : [], workspacePath: ws(), command: 'hydrate' });
    });
});
// ── log / status / revert ─────────────────────────────────────
program
    .command('log')
    .description('Show semantic memory timeline')
    .action(async () => {
    await run('log', async () => {
        const { default: handler } = await Promise.resolve().then(() => __importStar(require('./commands/history')));
        await handler({ args: [], workspacePath: ws(), command: 'log' });
    });
});
program
    .command('status')
    .description('Show pending AI tasks')
    .action(async () => {
    await run('status', async () => {
        const { default: handler } = await Promise.resolve().then(() => __importStar(require('./commands/history')));
        await handler({ args: [], workspacePath: ws(), command: 'status' });
    });
});
program
    .command('revert <id>')
    .description('Remove a specific context entry by UUID')
    .action(async (id) => {
    await run('revert', async () => {
        const { default: handler } = await Promise.resolve().then(() => __importStar(require('./commands/history')));
        await handler({ args: [id], workspacePath: ws(), command: 'revert' });
    });
});
// ── note ──────────────────────────────────────────────────────
program
    .command('note <message>')
    .description('Instantly capture a context note or architectural decision')
    .option('--scope <path>', 'Bind note to a specific file or directory')
    .option('--issue <ref>', 'Link to an external issue (e.g. ENG-404)')
    .option('--decision', 'Flag as an architectural decision')
    .action(async (message, opts) => {
    await run('note', async () => {
        const args = [message];
        if (opts.scope)
            args.push('--scope', opts.scope);
        if (opts.issue)
            args.push('--issue', opts.issue);
        if (opts.decision)
            args.push('--decision');
        const { default: handler } = await Promise.resolve().then(() => __importStar(require('./commands/note')));
        await handler({ args, workspacePath: ws(), command: 'note' });
    });
});
// ── commit ────────────────────────────────────────────────────
const commit = program.command('commit').description('Commit context to your semantic memory');
commit
    .command('memory <content>')
    .description('Commit a memory entry to the current branch')
    .option('--type <type>', 'Memory type (architecture|capability|pattern|convention)', 'architecture')
    .option('--file <path>', 'Anchor memory to a specific file')
    .action(async (content, opts) => {
    await run('commit memory', async () => {
        const args = ['memory', content, '--type', opts.type];
        if (opts.file)
            args.push('--file', opts.file);
        const { default: handler } = await Promise.resolve().then(() => __importStar(require('./commands/commit')));
        await handler({ args, workspacePath: ws(), command: 'commit' });
    });
});
commit
    .command('decision <context> <chosen>')
    .description('Record an architectural decision')
    .option('--reasoning <text>', 'Why this approach was chosen')
    .option('--file <path>', 'Anchor decision to a specific file')
    .action(async (context, chosen, opts) => {
    await run('commit decision', async () => {
        const args = ['decision', context, chosen];
        if (opts.reasoning)
            args.push('--reasoning', opts.reasoning);
        if (opts.file)
            args.push('--file', opts.file);
        const { default: handler } = await Promise.resolve().then(() => __importStar(require('./commands/commit')));
        await handler({ args, workspacePath: ws(), command: 'commit' });
    });
});
commit
    .command('task <title>')
    .description('Create a new tracked task on the current branch')
    .option('--slug <slug>', 'Custom slug (auto-derived from title if omitted)')
    .action(async (title, opts) => {
    await run('commit task', async () => {
        const args = ['task', title];
        if (opts.slug)
            args.push('--slug', opts.slug);
        const { default: handler } = await Promise.resolve().then(() => __importStar(require('./commands/commit')));
        await handler({ args, workspacePath: ws(), command: 'commit' });
    });
});
const commitUpdate = commit.command('update').description('Update the status of a tracked item');
commitUpdate
    .command('task <slug> <status>')
    .description('Update the status of an existing task (PLANNING|IN_PROGRESS|REVIEW|DONE|BLOCKED|CANCELLED)')
    .action(async (slug, status) => {
    await run('commit update task', async () => {
        const { default: handler } = await Promise.resolve().then(() => __importStar(require('./commands/commit')));
        await handler({ args: ['update', 'task', slug, status], workspacePath: ws(), command: 'commit' });
    });
});
commit
    .command('auto')
    .description('Auto-generate rich semantic context from the latest git commit')
    .action(async () => {
    await run('commit auto', async () => {
        const { default: handler } = await Promise.resolve().then(() => __importStar(require('./commands/commit')));
        await handler({ args: ['auto'], workspacePath: ws(), command: 'commit' });
    });
});
commit
    .command('staged')
    .description('Git pre-commit hook integration — enforces semantic summaries')
    .action(async () => {
    await run('commit staged', async () => {
        const { default: handler } = await Promise.resolve().then(() => __importStar(require('./commands/commit')));
        await handler({ args: ['staged'], workspacePath: ws(), command: 'commit' });
    });
});
// ── query ─────────────────────────────────────────────────────
program
    .command('query <question>')
    .description('Semantic search across project memory')
    .option('--commit <hash>', 'Time-travel: search memory as it existed at a past commit')
    .option('--top <n>', 'Number of results to return', '5')
    .action(async (question, opts) => {
    await run('query', async () => {
        const args = [question];
        if (opts.commit)
            args.push('--commit', opts.commit);
        args.push('--top', opts.top);
        const { default: handler } = await Promise.resolve().then(() => __importStar(require('./commands/query')));
        await handler({ args, workspacePath: ws(), command: 'query' });
    });
});
// ── dump / load / sync / conflicts ────────────────────────────
program
    .command('dump')
    .description('Serialize memory DB → .aigit/ledger.json')
    .action(async () => {
    await run('dump', async () => {
        const { default: handler } = await Promise.resolve().then(() => __importStar(require('./commands/sync')));
        await handler({ args: [], workspacePath: ws(), command: 'dump' });
    });
});
program
    .command('load')
    .description('Reconstruct memory DB ← .aigit/ledger.json')
    .action(async () => {
    await run('load', async () => {
        const { default: handler } = await Promise.resolve().then(() => __importStar(require('./commands/sync')));
        await handler({ args: [], workspacePath: ws(), command: 'load' });
    });
});
program
    .command('sync')
    .description('Bidirectional sync across all detected AI tools')
    .option('--dry-run', 'Preview changes without writing')
    .option('--skills', 'Include skills in sync')
    .option('--from <tool>', 'Source tool for targeted sync')
    .option('--to <tool>', 'Target tool for targeted sync')
    .action(async (opts) => {
    await run('sync', async () => {
        const args = [];
        if (opts.dryRun)
            args.push('--dry-run');
        if (opts.skills)
            args.push('--skills');
        if (opts.from)
            args.push('--from', opts.from);
        if (opts.to)
            args.push('--to', opts.to);
        const { default: handler } = await Promise.resolve().then(() => __importStar(require('./commands/sync')));
        await handler({ args, workspacePath: ws(), command: 'sync' });
    });
});
program
    .command('conflicts')
    .description('Show unresolved sync conflicts')
    .action(async () => {
    await run('conflicts', async () => {
        const { default: handler } = await Promise.resolve().then(() => __importStar(require('./commands/sync')));
        await handler({ args: [], workspacePath: ws(), command: 'conflicts' });
    });
});
// ── branch operations ─────────────────────────────────────────
program
    .command('check-conflicts [branch]')
    .description('Check for semantic conflicts with a target branch (default: main)')
    .action(async (branch) => {
    await run('check-conflicts', async () => {
        const { default: handler } = await Promise.resolve().then(() => __importStar(require('./commands/branch')));
        await handler({ args: branch ? [branch] : [], workspacePath: ws(), command: 'check-conflicts' });
    });
});
program
    .command('merge <source> [target]')
    .description('Port AI context from source branch to target branch')
    .action(async (source, target) => {
    await run('merge', async () => {
        const { default: handler } = await Promise.resolve().then(() => __importStar(require('./commands/branch')));
        await handler({ args: target ? [source, target] : [source], workspacePath: ws(), command: 'merge' });
    });
});
// ── code analysis ─────────────────────────────────────────────
program
    .command('anchor <file>')
    .description('Re-anchor existing memories to AST symbols after refactoring')
    .action(async (file) => {
    await run('anchor', async () => {
        const { default: handler } = await Promise.resolve().then(() => __importStar(require('./commands/anchor')));
        await handler({ args: [file], workspacePath: ws(), command: 'anchor' });
    });
});
program
    .command('scan')
    .description('Detect active AI tools in the workspace')
    .action(async () => {
    await run('scan', async () => {
        const { default: handler } = await Promise.resolve().then(() => __importStar(require('./commands/scan')));
        await handler({ args: [], workspacePath: ws(), command: 'scan' });
    });
});
program
    .command('replay <path>')
    .description('Replay the chronological evolution of a file or module')
    .action(async (filePath) => {
    await run('replay', async () => {
        const { default: handler } = await Promise.resolve().then(() => __importStar(require('./commands/replay')));
        await handler({ args: [filePath], workspacePath: ws(), command: 'replay' });
    });
});
// ── docs ──────────────────────────────────────────────────────
program
    .command('docs')
    .description('Auto-generate ARCHITECTURE.md from the memory ledger')
    .option('--out <path>', 'Output file path')
    .action(async (opts) => {
    await run('docs', async () => {
        const args = [];
        if (opts.out)
            args.push('--out', opts.out);
        const { default: handler } = await Promise.resolve().then(() => __importStar(require('./commands/docs')));
        await handler({ args, workspacePath: ws(), command: 'docs' });
    });
});
program
    .command('export-docs')
    .description('Export ARCHITECTURE.md (alias for docs)')
    .action(async () => {
    await run('export-docs', async () => {
        const { default: handler } = await Promise.resolve().then(() => __importStar(require('./commands/docs')));
        await handler({ args: [], workspacePath: ws(), command: 'export-docs' });
    });
});
// ── swarm ─────────────────────────────────────────────────────
program
    .command('swarm [goal]')
    .description('Create or manage a multi-agent swarm session')
    .action(async (goal) => {
    const sub = goal ?? '';
    await run('swarm', async () => {
        const { default: handler } = await Promise.resolve().then(() => __importStar(require('./commands/swarm')));
        await handler({ args: sub ? [sub] : [], workspacePath: ws(), command: 'swarm' });
    });
});
// ── self-healing ──────────────────────────────────────────────
program
    .command('heal')
    .description('Run tests, diagnose failures, and propose fixes')
    .option('--auto', 'Auto-commit fixes derived from memory')
    .action(async (opts) => {
    await run('heal', async () => {
        const args = opts.auto ? ['--auto'] : [];
        const { default: handler } = await Promise.resolve().then(() => __importStar(require('./commands/heal')));
        await handler({ args, workspacePath: ws(), command: 'heal' });
    });
});
program
    .command('deps')
    .description('Audit npm dependencies & correlate with past context')
    .option('--auto', 'Auto-branch and fix vulnerabilities')
    .action(async (opts) => {
    await run('deps', async () => {
        const args = opts.auto ? ['--auto'] : [];
        const { default: handler } = await Promise.resolve().then(() => __importStar(require('./commands/deps')));
        await handler({ args, workspacePath: ws(), command: 'deps' });
    });
});
// ── handoff ───────────────────────────────────────────────────
program
    .command('handoff <slug>')
    .description('Generate a copy-paste agent context block for a task handoff')
    .action(async (slug) => {
    await run('handoff', async () => {
        const { default: handler } = await Promise.resolve().then(() => __importStar(require('./commands/handoff')));
        await handler({ args: [slug], workspacePath: ws(), command: 'handoff' });
    });
});
// ── update (shorthand for agents) ───────────────────────────
const update = program.command('update').description('Update the status of a tracked item');
update
    .command('task <slug> <status>')
    .description('Update task status (PLANNING|IN_PROGRESS|REVIEW|DONE|BLOCKED|CANCELLED)')
    .action(async (slug, status) => {
    await run('update task', async () => {
        const { default: handler } = await Promise.resolve().then(() => __importStar(require('./commands/commit')));
        await handler({ args: ['update', 'task', slug, status], workspacePath: ws(), command: 'commit' });
    });
});
// ── mcp ───────────────────────────────────────────────────────
program
    .command('mcp [directory]')
    .description('Start the MCP server via STDIO transport')
    .option('--profile <profile>', 'Tool subset to expose: core | swarm | ops | all', 'all')
    .action(async () => {
    await (0, db_1.initializeDatabase)();
    require('../index');
});
// ── telemetry ─────────────────────────────────────────────────
program
    .command('telemetry <command>')
    .description('Manage anonymous usage telemetry')
    .action(async (cmd) => {
    await run('telemetry', async () => {
        const { default: handler } = await Promise.resolve().then(() => __importStar(require('./commands/telemetry')));
        await handler({ args: [cmd], workspacePath: ws(), command: 'telemetry' });
    });
});
// ── Parse ──────────────────────────────────────────────────────
program.parse(process.argv);
