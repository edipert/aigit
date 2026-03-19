"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GLOBAL_HELP = exports.COMMAND_REGISTRY = void 0;
// Eagerly import all command handlers.
// Each handler is a small module — no benefit from lazy dynamic import here
// since initializeDatabase() already runs before dispatch.
const init_1 = __importDefault(require("./commands/init"));
const hydrate_1 = __importDefault(require("./commands/hydrate"));
const history_1 = __importDefault(require("./commands/history"));
const sync_1 = __importDefault(require("./commands/sync"));
const query_1 = __importDefault(require("./commands/query"));
const note_1 = __importDefault(require("./commands/note"));
const commit_1 = __importDefault(require("./commands/commit"));
const anchor_1 = __importDefault(require("./commands/anchor"));
const scan_1 = __importDefault(require("./commands/scan"));
const swarm_1 = __importDefault(require("./commands/swarm"));
const heal_1 = __importDefault(require("./commands/heal"));
const deps_1 = __importDefault(require("./commands/deps"));
const docs_1 = __importDefault(require("./commands/docs"));
const replay_1 = __importDefault(require("./commands/replay"));
const telemetry_1 = __importDefault(require("./commands/telemetry"));
const branch_1 = __importDefault(require("./commands/branch"));
exports.COMMAND_REGISTRY = {
    // Bootstrap
    init: init_1.default,
    'init-hook': init_1.default,
    // Context access
    hydrate: hydrate_1.default,
    log: history_1.default,
    status: history_1.default,
    revert: history_1.default,
    // Storage
    dump: sync_1.default,
    load: sync_1.default,
    sync: sync_1.default,
    conflicts: sync_1.default,
    // Branch operations
    'check-conflicts': branch_1.default,
    merge: branch_1.default,
    // Semantic memory
    query: query_1.default,
    note: note_1.default,
    commit: commit_1.default,
    // Code analysis
    anchor: anchor_1.default,
    scan: scan_1.default,
    replay: replay_1.default,
    // Docs
    docs: docs_1.default,
    'export-docs': docs_1.default,
    // Swarm
    swarm: swarm_1.default,
    // Self-healing
    heal: heal_1.default,
    deps: deps_1.default,
    // Other
    telemetry: telemetry_1.default,
    mcp: async () => {
        // MCP server start is handled before registry dispatch in main cli/index.ts
    },
};
exports.GLOBAL_HELP = `
aigit — The AI Context Engine for Git

Commands:
  init                          Initialize aigit in current repo (hooks + .aigit/)
  hydrate [file]                Compile branch-aware context prompt
  dump                          Serialize memory DB → .aigit/ledger.json
  load                          Reconstruct memory DB ← .aigit/ledger.json
  log                           Show semantic memory timeline
  status                        Show pending AI tasks
  revert <id>                   Remove a specific context entry
  check-conflicts [branch]      Check for semantic conflicts vs branch
  merge <source> [target]       Port AI context between branches
  init-hook                     Install Git hooks only
  anchor <file>                 Re-anchor existing memories to AST symbols
  query "<question>"            Semantic search across memory
  query "<question>" --commit <hash>  Time-travel: search memory at a past commit
  replay <path>                 Replay the chronological evolution of a file/module
  docs [--out <path>]           Auto-generate ARCHITECTURE.md from memory ledger

Context:
  note "<message>"              Instantly capture a manual context note
  commit memory "<text>"        Commit a memory entry to current branch
  commit decision "<ctx>" "<chosen>"  Record an architectural decision
  commit task "<title>"         Create a tracked task

Agent Sync:
  scan                          Detect active AI tools in the workspace
  sync [--dry-run] [--skills]   Bidirectional sync across all detected tools
  sync --from <tool> --to <tool>  One-directional targeted sync
  conflicts                     Show unresolved sync conflicts

Swarm Orchestration:
  swarm "<goal>"                Create a multi-agent swarm session
  swarm status                  View swarm state (agents, turns, messages)
  swarm halt <id>               Halt an active swarm
  swarm resume <id>             Resume a halted swarm
  swarm conflicts               List unresolved swarm conflicts
  swarm resolve <id> <text>     Resolve a conflict

Self-Healing Codebases:
  heal                          Run tests, diagnose failures, map AST context, propose fixes
  heal --auto                   Auto-commit fixes derived from memory
  heal status                   List test-failure healing history
  deps                          Audit npm dependencies & correlate with past context
  deps --auto                   Auto-branch and fix vulnerabilities

Other:
  telemetry off                 Show instructions to disable anonymous usage tracking
`;
