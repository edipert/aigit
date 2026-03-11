import type { CommandHandler } from './commands/types';

// Eagerly import all command handlers.
// Each handler is a small module — no benefit from lazy dynamic import here
// since initializeDatabase() already runs before dispatch.
import initHandler from './commands/init';
import hydrateHandler from './commands/hydrate';
import historyHandler from './commands/history';
import syncHandler from './commands/sync';
import queryHandler from './commands/query';
import noteHandler from './commands/note';
import commitHandler from './commands/commit';
import anchorHandler from './commands/anchor';
import scanHandler from './commands/scan';
import swarmHandler from './commands/swarm';
import healHandler from './commands/heal';
import depsHandler from './commands/deps';
import docsHandler from './commands/docs';
import replayHandler from './commands/replay';
import telemetryHandler from './commands/telemetry';
import branchHandler from './commands/branch';

export const COMMAND_REGISTRY: Record<string, CommandHandler> = {
    // Bootstrap
    init: initHandler,
    'init-hook': initHandler,

    // Context access
    hydrate: hydrateHandler,
    log: historyHandler,
    status: historyHandler,
    revert: historyHandler,

    // Storage
    dump: syncHandler,
    load: syncHandler,
    sync: syncHandler,
    conflicts: syncHandler,

    // Branch operations
    'check-conflicts': branchHandler,
    merge: branchHandler,

    // Semantic memory
    query: queryHandler,
    note: noteHandler,
    commit: commitHandler,

    // Code analysis
    anchor: anchorHandler,
    scan: scanHandler,
    replay: replayHandler,

    // Docs
    docs: docsHandler,
    'export-docs': docsHandler,

    // Swarm
    swarm: swarmHandler,

    // Self-healing
    heal: healHandler,
    deps: depsHandler,

    // Other
    telemetry: telemetryHandler,
    mcp: async () => {
        // MCP server start is handled before registry dispatch in main cli/index.ts
    },
};

export const GLOBAL_HELP = `
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
