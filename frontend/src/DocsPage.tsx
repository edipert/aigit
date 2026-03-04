import { useState } from 'react';

interface DocSection {
  id: string;
  title: string;
  content: string;
}

const sections: DocSection[] = [
  {
    id: 'best-practices',
    title: 'Best Usage & Workflows',
    content: `### 🌟 What is aigit?
At its core, aigit is the **Central Nervous System for AI-assisted Development**. 

The biggest problem with AI coding agents today (Cursor, Windsurf, Claude, Copilot) is that they are **amnesic and siloed**. They forget architectural decisions made last week, and context built in Cursor doesn't transfer to a teammate using Claude.

aigit solves this by acting as a universal, git-aligned memory layer and orchestration engine.

---

### 🚀 The 5-Step Ideal Workflow

To get the absolute maximum value out of aigit, developers should weave it into their daily loop:

#### 1. Setup & Unification (Single Source of Truth)
Instead of managing multiple \`.cursorrules\`, \`.clinerules\`, and \`.claude\` folders, you use aigit to unify them.

\`\`\`bash
# 1. Initialize the semantic ledger and Git hooks
aigit init

# 2. Automatically collapse fragmented agent skills into a single .aigit/skills directory
aigit sync --skills
\`\`\`

#### 2. The Context-Aware Coding Loop (via MCP)
The most powerful way to use aigit is **not** via the CLI, but as a background brain connected to your IDE.

*   **Action**: You configure your AI IDE (Cursor, Windsurf, Claude) to connect to aigit's local **MCP Server**.
*   **Result**: When you ask your IDE, *"Why did we choose Redis over Postgres for this feature?"*, the IDE doesn't just guess. It uses the MCP server to query aigit's Time-Traveling Semantic Ledger, fetching the exact architectural decision you recorded 3 weeks ago.

#### 3. Continuous Semantic Memory (Invisible Documentation)
Developers hate writing documentation. aigit handles it invisibly.

*   **Action**: You commit code normally.
    \`\`\`bash
    git commit -m "feat: setup auth"
    \`\`\`
*   **Result**: The \`pre-commit\` hook seamlessly triggers \`aigit commit auto\`. It captures your commit message, diff stats, and file changes, embedding them directly into \`.aigit/ledger.json\`. 
*   **Bonus**: Run \`aigit docs\` at any time to auto-generate a fresh, Mermaid-diagrammed \`ARCHITECTURE.md\` perfectly synced with your code.

#### 4. The "Guardian" pre-push Hook (Self-Healing)
Before pushing broken code or vulnerable dependencies to GitHub, aigit acts as a local CI guardian.

*   **Action**: You run \`git push\`.
*   **Result**: The custom \`pre-push\` hook triggers \`npx aigit heal\`.
*   **Workflow**: 
    1. It runs your test suite. 
    2. If a test fails, it captures the stack trace.
    3. It parses your AST to map the failure to specific functions.
    4. It queries the \`ledger.json\` to see if this bug has been fixed before.
    5. It prints a **Healing Plan** detailing exactly how to fix the bug, or if you run \`aigit heal --auto\`, it automatically patches the code and commits the fix for you before pushing.

#### 5. Multi-Agent Swarm Orchestration (For Complex Tasks)
When a task is too big for a single prompt, you bring in the Swarm.

*   **Action**: You run \`aigit swarm\`.
    \`\`\`bash
    aigit swarm "Build the JWT authentication middleware"
    \`\`\`
*   **Result**: It spins up specialized agents (e.g., frontend, backend, security).
*   **Workflow**: The Architect outlines the database schema, the Security Auditor reviews it for vulnerabilities, and the Frontend Specialist waits for the API to be approved before generating React components. They talk to each other over the local message bus, resolving architectural conflicts autonomously.`
  },
  {
    id: 'quickstart',
    title: 'Quick Start',
    content: `### Install
The recommended way to install aigit is globally via npm:

\`\`\`bash
npm install -g aigit-core
\`\`\`

*Alternatively, you can run it on-the-fly without installing:*
\`\`\`bash
npx aigit-core init
\`\`\`

### Initialize Semantic DB
Navigate to any git repository and run:
\`\`\`bash
aigit init
\`\`\`

This will create a lightweight local Vector DB (PGlite) in the \`.aigit/\` folder to store your project's semantic memory.

### Install Git Hooks
To ensure your memory stays perfectly synchronized with your branch changes:
\`\`\`bash
aigit init-hook
\`\`\`
This installs native \`pre-commit\`, \`post-checkout\`, and \`pre-push\` hooks.

### Start the MCP Server
If you are using an AI IDE like Cursor or Windsurf, connect them to aigit's real-time memory by running:
\`\`\`bash
aigit mcp
\`\`\`
Then, add the local server URL to your IDE's MCP configuration.`
  },
  {
    id: 'cli-core',
    title: 'CLI — Core Commands',
    content: `### \`aigit init\`
Initialize aigit in the current repository. Creates \`.aigit/\` directory and installs Git hooks.

### \`aigit hydrate [file]\`
Compile a branch-aware context prompt from your semantic memory database. Optionally focus on a specific file.

\`\`\`bash
❯ aigit hydrate
[aigit] Compiling branch context (main)...
[aigit] Ingesting 14 architectural decisions...
✅ Context Hydrated. Agent ready.
\`\`\`

### \`aigit dump\`
Serialize the in-memory PGlite database to \`.aigit/ledger.json\`. This file is Git-trackable.

### \`aigit load\`
Reconstruct the memory database from \`.aigit/ledger.json\` after a Git pull or clone.`
  },
  {
    id: 'cli-git',
    title: 'CLI — Git Context',
    content: `### \`aigit log\`
View a semantic memory timeline partitioned by your active branch. Shows memories, decisions, and tasks with timestamps.

\`\`\`bash
❯ aigit log
⏳ Recent Semantic Memory (Branch: main)

[10/24/2026] (main) [DECISION]
    Remote DB was locking → Switched to Redis.
[10/20/2026] (main) [MEMORY]
    Core Architecture: React + Node.js Context Server.
\`\`\`

### \`aigit status\`
Show pending AI tasks and active context state.

### \`aigit revert <id>\`
Remove a specific memory or decision entry by UUID.

### \`aigit check-conflicts [branch]\`
Check for semantic conflicts between your current branch and the target branch before merging.

\`\`\`bash
❯ aigit check-conflicts main
⚠️ CONTEXT CONFLICT WARNING
Branch 'feature/auth' contains 2 architectural decisions
that might conflict with main.
\`\`\`

### \`aigit merge <source> [target]\`
Port AI context (memories, decisions, tasks) from one branch to another.

\`\`\`bash
❯ aigit merge feature/auth main
🔍 SEMANTIC MERGE
Ready to port: 1 Task, 2 Decisions
✅ Successfully merged semantic context.
\`\`\``
  },
  {
    id: 'cli-sync',
    title: 'CLI — Agent Sync',
    content: `### \`aigit scan\`
Auto-detect all AI coding tools in your workspace.

\`\`\`bash
❯ aigit scan
🔍 Detected 4 AI tool(s):

  🤖 Google Gemini (gemini)
    • AGENTS.md • MEMORY.md • .agent/

  🤖 Cursor (cursor)
    • .cursorrules

  🤖 Cline / Roo (cline)
    • .clinerules

  🤖 Windsurf (windsurf)
    • .windsurfrules
\`\`\`

### \`aigit sync [--dry-run]\`
Bidirectional sync of rules and memory across all detected tools.

\`\`\`bash
# Preview what would change
❯ aigit sync --dry-run
🔄 DRY RUN — 67 section(s) to sync:
  → [cursor] .cursorrules
    + "Clean Code Rules"
    + "Agent Protocol"
  (dry run — no files changed)

# Actually sync
❯ aigit sync
\`\`\`

### \`aigit sync --from <tool> --to <tool>\`
One-directional targeted sync between specific tools.

\`\`\`bash
❯ aigit sync --from gemini --to cursor
\`\`\`

### \`aigit conflicts\`
Show unresolved rule conflicts that need manual resolution before syncing.

\`\`\`bash
❯ aigit conflicts
✅ No conflicts detected. All tools are in sync.
\`\`\``
  },
  {
    id: 'cli-rag',
    title: 'CLI — RAG & Search',
    content: `### \`aigit anchor <file>\`
Retroactively scan a file, extract code symbols (functions, classes, methods) via AST parsing, and link existing memories/decisions to those symbols.

\`\`\`bash
❯ aigit anchor src/db/redis.ts
⚓ [aigit anchor] Scanned: src/db/redis.ts
   Anchored 3/5 unlinked entries to code symbols.
\`\`\`

### \`aigit query "<question>"\`
Semantic search across your project memory. Finds relevant decisions and memories ranked by similarity.

\`\`\`bash
❯ aigit query "Why did we choose Redis?"
🔍 Semantic Search Results:
  1. [DECISION] (0.87) Remote DB was locking → Switched to Redis
     📁 src/db/redis.ts ⚓ @initRedisClient
  2. [MEMORY] (0.65) Cache layer: Redis for sessions
     📁 src/cache/index.ts
\`\`\`

### \`aigit query "<question>" --commit <hash>\`
Time-traveling RAG: query the project memory as it existed at a specific Git commit.

\`\`\`bash
❯ aigit query "Why auth flow?" --commit a1b2c3d
🕰️  Time-Travel @ a1b2c3d:
  1. (0.82) [DECISION] JWT vs sessions → JWT chosen
     📁 src/auth/jwt.ts ⚓ @verifyToken
\`\`\`

Use \`--top <n>\` to limit results (default: 5).`
  },
  {
    id: 'cli-swarm',
    title: 'CLI — Swarm Orchestration',
    content: `### Overview

**aigit swarm** enables multi-agent orchestration — multiple AI agents (e.g. Backend Specialist, Security Auditor) can collaborate on a shared task using a turn-taking protocol with automatic conflict resolution.

### How It Works

\`\`\`
┌────────────────────────────────────────────────┐
│              aigit swarm "Build auth"           │
├────────────────────────────────────────────────┤
│                                                │
│  Developer creates a swarm session via CLI     │
│                    ↓                           │
│  Agents register via MCP (register_agent)      │
│                    ↓                           │
│  Sequential turn-taking begins:                │
│    Turn 1: backend-specialist → WORKING        │
│    Turn 2: security-auditor   → IDLE           │
│                    ↓                           │
│  Agents publish messages to the bus            │
│  Agents poll messages addressed to them        │
│                    ↓                           │
│  If conflict detected → swarm HALTS            │
│  Developer resolves → swarm RESUMES            │
│                    ↓                           │
│  All agents DONE → session completes           │
│                                                │
└────────────────────────────────────────────────┘
\`\`\`

### \\\`aigit swarm "<goal>"\\\`
Create a new multi-agent swarm session. The goal describes what the agents should accomplish together.

\\\`\\\`\\\`bash
❯ aigit swarm "Build auth module with JWT"

🐝 [aigit swarm] Session created: a1b2c3d4e5f6
   Goal: Build auth module with JWT
   Branch: feature/auth
   Status: PENDING — waiting for agents to register

   Agents can join via MCP: register_agent(swarmId: 'a1b2c3...', role: '...')
\\\`\\\`\\\`

### \\\`aigit swarm status\\\`
View the full state of active swarms — agents, turn order, current status, and task slugs.

\\\`\\\`\\\`bash
❯ aigit swarm status

🐝 SWARM: Build auth module with JWT
   Status: 🔄 ACTIVE — Turn 1/3
   Branch: feature/auth

   AGENTS:
   1. 🔄 backend-specialist (backend) — WORKING [auth-setup]
   2. ⏳ security-auditor (security) — IDLE [no task]
   3. ⏳ frontend-agent (frontend) — IDLE [no task]
\\\`\\\`\\\`

### \\\`aigit swarm halt <id>\\\` / \\\`aigit swarm resume <id>\\\`
Manually halt or resume a swarm session.

\\\`\\\`\\\`bash
❯ aigit swarm halt a1b2c3d4
⛔ Swarm a1b2c3d4 halted.

❯ aigit swarm resume a1b2c3d4
▶️ Swarm a1b2c3d4 resumed.
\\\`\\\`\\\`

### \\\`aigit swarm conflicts\\\`
List all unresolved conflicts across active swarms. When an agent reports a conflict, the swarm automatically halts.

\\\`\\\`\\\`bash
❯ aigit swarm conflicts

⚠️  1 conflict(s) in swarm "Build auth module":

   CONFLICT a1b2c3d4:
   security-auditor: GraphQL exposes excessive surface area
   Blocked: Use GraphQL for API layer
   📁 src/api/schema.ts ⚓ @createSchema
\\\`\\\`\\\`

### \\\`aigit swarm resolve <id> <resolution>\\\`
Resolve a conflict with your decision. The swarm automatically resumes.

\\\`\\\`\\\`bash
❯ aigit swarm resolve a1b2c3d4 "Use REST with strict input validation"
✅ Conflict resolved: Use REST with strict input validation
\\\`\\\`\\\`

### MCP Integration

Agents interact with swarms via 9 MCP tools:

| Tool | Purpose |
|------|---------|
| \\\`register_agent\\\` | Join a swarm with a role |
| \\\`unregister_agent\\\` | Leave a swarm session |
| \\\`create_swarm\\\` | Create a new swarm (alternative to CLI) |
| \\\`publish_message\\\` | Send a message to the bus (broadcast or targeted) |
| \\\`poll_messages\\\` | Check for messages addressed to this agent |
| \\\`update_agent_status\\\` | Update status (IDLE → WORKING → DONE) |
| \\\`get_swarm_status\\\` | Full dashboard: agents + messages + conflicts |
| \\\`report_conflict\\\` | Flag a conflict (auto-halts swarm) |
| \\\`resolve_conflict\\\` | Resolve conflict (auto-resumes swarm) |`
  },
  {
    id: 'cli-heal',
    title: 'CLI — Self-Healing',
    content: `### Overview

aigit can shift from an assistive memory tool into a proactive maintainer. The **Self-Healing Codebases** feature allows aigit to intercept failing tests and vulnerable dependencies, diagnose them using semantic memory, and propose or auto-commit fixes.

### \`aigit heal [options]\`
Run your test suite, diagnose failures, and propose contextual fixes.

\`\`\`bash
❯ aigit heal
🧪 Running test suite...
❌ Tests failed. Diagnosing...

🩹 [aigit heal] Diagnosis Report
──────────────────────────────────────────────────
1 test failure(s) detected.

📍 Failure Targets:
  ✕ [Unknown test] Test failed at line 42

💡 Suggested Actions:
  1. Investigate: Test failed at line 42
\`\`\`

- **\`--auto\`**: Automatically commit AI-generated fixes for failing tests (requires an MCP agent to consume the plan).
- **\`--cmd "<command>"\`**: Override the default \`npm test\` runner.

### \`aigit heal status\`
View the history of recent self-healing events and their status from the embedded database.

\`\`\`bash
❯ aigit heal status
📋 [aigit heal] History (1 event(s)):

  ⏳ [PENDING] test_failure — 1 test failure(s) detected.
     Branch: main | Strategy: propose | 2026-03-01 00:55:28
     ID: 56351fb4-9d1
\`\`\`

### \`aigit deps [options]\`
Audit your npm dependencies, evaluate vulnerabilities against semantic rules, and propose updates.

\`\`\`bash
❯ aigit deps
📦 Running dependency audit...

📦 [aigit deps] Dependency Audit Report
──────────────────────────────────────────────────
8 vulnerability(ies): 0 critical, 0 high, 8 moderate, 0 low. 8 auto-fixable.
\`\`\`

- **\`--auto\`**: Automatically branch (\`aigit/dep-heal-...\`), fix vulnerabilities, and commit the dependency updates cleanly.`
  },
  {
    id: 'cli-security',
    title: 'CLI — Semantic Security',
    content: `### Overview

As LLMs generate more code and interact with more tools, the risk of prompt injections and leaked secrets increases. aigit provides **Red-Teaming & Semantic Security** through background scrubbing and adversarial auditing.

### \`aigit dump\` (Scrubbed)
When you serialize your memory DB to \`.aigit/ledger.json\`, aigit automatically runs a heuristic scrubbing engine.

- **Redacted Secrets**: Automatically detects and masks API keys (AWS, Stripe, GitHub, generic bearer tokens), JWTs, and email addresses.
- **Git Check**: Ensures sensitive PII and keys never make it into your repository's tracked ledger.

\`\`\`bash
❯ aigit dump
🔒 Scrubbing payloads for PII and secrets...
✅ Serialized 14 memories and 3 decisions to .aigit/ledger.json
\`\`\`

### Security Auditor Agent
A dedicated adversarial AI profile (\`security-auditor\`) that hunts for loopholes, prompt injections, and OWASP Top 10 vulnerabilities in your generated context.

- **\`audit_semantic_decisions\`**: An MCP tool that fetches recent semantic decisions for the auditor to review.
- **\`flag_vulnerability\`**: Allows the auditor to log a specific security warning and automatically spawn a \`BLOCKED\` task for human or agent review.`
  },
  {
    id: 'mcp',
    title: 'MCP Integration',
    content: `### Model Context Protocol

aigit runs as an MCP server, making your semantic memory available to any MCP-compatible AI tool.

### CLI Command

You can run the MCP server directly from the terminal for testing or standalone use:

\`\`\`bash
aigit mcp
\`\`\`

### IDE Configuration

Add aigit to your AI IDE's MCP settings (e.g., Claude Desktop, Cursor):

\`\`\`json
{
  "mcpServers": {
    "aigit": {
      "command": "aigit",
      "args": ["mcp"],
      "cwd": "/path/to/your/project"
    }
  }
}
\`\`\`

### Available MCP Tools

| Tool | Description |
|------|-------------|
| \`commit_memory\` | Save a memory — auto-anchors to code symbols if filePath+lineNumber provided |
| \`commit_decision\` | Log a decision — auto-resolves enclosing function/class via AST |
| \`hydrate_context\` | Get branch-aware, symbol-enriched context prompt |
| \`query_context\` | Semantic search across live project memory |
| \`query_historical\` | Time-travel: query memory at a specific Git commit |
| \`get_symbol_context\` | Get all linked context for a specific code symbol at file+line |
| \`anchor_file\` | Retroactively link memories to code symbols via AST |
| \`list_symbols\` | Extract all functions/classes/methods from a source file |
| \`revert_context\` | Delete a memory, decision, or task by UUID |
| \`check_conflicts\` | Detect semantic conflicts between branches before merging |
| \`merge_context\` | Port context (memories, decisions, tasks) between branches |
| \`scan_agents\` | Detect all AI coding tools configured in the workspace |
| \`commit_task\` | Create a new task stub for context handoff |
| \`get_project_history\` | Retrieve all memories and decisions for a project |
| \`create_swarm\` | Create a multi-agent swarm session with sub-tasks |
| \`register_agent\` | Register an agent into a swarm with a role |
| \`unregister_agent\` | Remove an agent from a swarm |
| \`publish_message\` | Send a message to the swarm bus (broadcast or role-targeted) |
| \`poll_messages\` | Poll for messages addressed to this agent |
| \`update_agent_status\` | Update agent status (IDLE/WORKING/DONE/BLOCKED) |
| \`get_swarm_status\` | Full swarm dashboard (agents, messages, conflicts) |
| \`report_conflict\` | Flag a conflict — auto-halts the swarm |
| \`resolve_conflict\` | Resolve a conflict and resume the swarm |

### Supported Tools
Cursor, Windsurf, Claude Code, Cline/Roo, VS Code with Copilot, and any tool supporting MCP.`
  },
  /*
    {
      id: 'vscode',
      title: 'VS Code Extension',
      content: `### Installation
  
  Install the ** Aigit — AI Context Explorer ** extension from the VS Code marketplace or build from source:
  
  \`\`\`bash
  cd vscode-aigit && npm run build
  \`\`\`
  
  ### Sidebar Panels
  
  **Context Timeline** — View your semantic memory history, anchored entries for the active file, and quick action buttons (Refresh, Dump, Load).
  
  **Agent Sync Dashboard** — See detected AI tools, sync status, and action buttons:
  - 🔍 **Scan** — Detect all AI tools
  - 📋 **Dry Run** — Preview sync changes
  - 🔄 **Sync** — Apply sync
  - ⚠️ **Conflicts** — View blocking conflicts
  
  ### Inline Context (CodeLens + Hover)
  
  When you open a file with linked memories or decisions, you'll see:
  
  - **CodeLens** — Inline hints like \`🧭 aigit @initRedis: Switched to Redis\` appear above functions. Click to see full details.
  - **Hover Tooltips** — Hover near a function with linked context to see a rich tooltip with the decision, reasoning, and timestamps.
  - **Pre-fetching** — Context is pre-loaded as you move your cursor (300ms debounce). No manual refresh needed.
  
  ### Settings
  
  | Setting | Default | Description |
  |---------|---------|-------------|
  | \`aigit.enableCodeLens\` | \`true\` | Show inline context hints above functions |
  | \`aigit.enableHover\` | \`true\` | Show context tooltips on hover |
  | \`aigit.prefetchDebounceMs\` | \`300\` | Debounce delay for pre-fetching |
  
  ### Status Bar
  A persistent indicator shows sync health: tool count, pending syncs, or conflict warnings.
  
  ### Auto-Refresh
  The extension watches all agent config files (\`.cursorrules\`, \`CLAUDE.md\`, \`AGENTS.md\`, etc.) and auto-rescans when any file changes.`
    },
  */
  {
    id: 'architecture',
    title: 'Architecture',
    content: `### How aigit Works

\`\`\`
┌─────────────────────────────────────────┐
│          Your Git Repository            │
├─────────────────────────────────────────┤
│  .aigit/                                │
│    ├── memory.db    (PGlite + pgvector) │
│    ├── ledger.json  (Git-trackable)     │
│    └── conflicts.json                   │
├─────────────────────────────────────────┤
│  Git Hooks                              │
│    pre-commit    → aigit commit auto    │
│    post-checkout → aigit load           │
│    pre-push      → aigit dump           │
├─────────────────────────────────────────┤
│  Agent Files                            │
│    AGENTS.md / CLAUDE.md / .cursorrules │
│    .clinerules / .windsurfrules         │
└─────────────────────────────────────────┘
\`\`\`

### Embedded Database
aigit uses **PGlite** — a WASM-compiled PostgreSQL with \`pgvector\` for semantic similarity. No Docker, no external services. Everything stays local.

### Branch Isolation
Each Git branch gets its own context. When you \`git checkout\`, the post-checkout hook automatically loads the correct branch memory.

### Context Tracking
The \`pre-commit\` hook automatically captures your staged code changes and commit messages, embedding them into the active semantic memory without any manual data entry.

### Ledger Sync
\`aigit dump\` serializes the in-memory database to \`ledger.json\`. This file is committed to Git, so your semantic memory travels with the repo.

### Agent Sync Pipeline
\`\`\`
Scan → Parse → Diff → Apply
  │       │       │       │
  │       │       │       └── Write missing sections
  │       │       └── Compare headings across tools
  │       └── Parse MD / YAML / flat rules
  └── Detect 8 AI tools by file presence
\`\`\``
  }
];

function renderMarkdown(md: string): string {
  return md
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre class="doc-code"><code>$2</code></pre>')
    .replace(/\|(.+)\|\n\|[-| ]+\|\n((?:\|.+\|\n?)*)/g, (_match, header: string, body: string) => {
      const ths = header.split('|').filter(Boolean).map((h: string) => `<th>${h.trim()}</th>`).join('');
      const rows = body.trim().split('\n').map((row: string) => {
        const tds = row.split('|').filter(Boolean).map((d: string) => `<td>${d.trim()}</td>`).join('');
        return `<tr>${tds}</tr>`;
      }).join('');
      return `<table class="doc-table"><thead><tr>${ths}</tr></thead><tbody>${rows}</tbody></table>`;
    })
    .replace(/^---$/gm, '<hr class="doc-hr"/>')
    .replace(/#### (.+)/g, '<h4 class="doc-h4">$1</h4>')
    .replace(/### (.+)/g, '<h3 class="doc-h3">$1</h3>')
    .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br/>');
}

export function DocsPage() {
  const [activeSection, setActiveSection] = useState('quickstart');
  const current = sections.find(s => s.id === activeSection) || sections[0];

  return (
    <div className="docs-page">
      <aside className="docs-sidebar">
        <div className="docs-sidebar-title">Documentation</div>
        {sections.map(s => (
          <button
            key={s.id}
            className={`docs-nav-item ${activeSection === s.id ? 'active' : ''}`}
            onClick={() => setActiveSection(s.id)}
          >
            {s.title}
          </button>
        ))}
      </aside>
      <main className="docs-content">
        <h1 className="docs-page-title">{current.title}</h1>
        <div
          className="docs-body"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(current.content) }}
        />
      </main>
    </div>
  );
}
