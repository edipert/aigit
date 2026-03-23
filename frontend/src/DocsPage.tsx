import { useState } from 'react';
import { SEO } from './SEO';

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

Simply **configure your AI IDE** (Cursor, Windsurf, Claude) to connect to aigit's local **MCP Server**. When you ask your IDE, *"Why did we choose Redis over Postgres for this feature?"*, the IDE doesn't just guess. It actively queries aigit's Time-Traveling Semantic Ledger, fetching the exact architectural decision you recorded weeks ago.

#### 3. Agent-Driven Semantic Memory (Context Generation)
Developers hate writing documentation. aigit handles it seamlessly using your AI agents.

Rather than relying on noisy, token-heavy \`git diff\` blobs, context generation is shifted upstream to your AI agents (Cursor, Windsurf, etc).

When an agent finishes coding, they run:
    \`\`\`bash
    aigit commit memory "Refactored the authentication flow to use JWTs instead of sessions"
    \`\`\`
This deeply synthesizes the architectural intent *before* the code is committed. The \`pre-commit\` hook natively detects these agent-authored memories and optimizes the \`.aigit/ledger.json\` database to remain perfectly clean and token-efficient.

#### 4. The "Guardian" pre-push Hook (Self-Healing)
Before pushing broken code or vulnerable dependencies to GitHub, aigit acts as a local CI guardian.

When you run \`git push\`, the custom \`pre-push\` hook triggers \`npx aigit heal\`. This initiates a workflow that runs your test suite, captures stack traces from failures, and parses your AST to map failures to specific functions. It queries \`ledger.json\` to see if the bug has been fixed before, then prints a **Healing Plan**. If you run \`aigit heal --auto\`, it automatically patches the code and commits the fix.

#### 5. Smart Hybrid Commit Enforcement (The pre-commit Hook)
To protect your semantic ledger, aigit enforces the memory rule directly in Git. But it behaves completely differently depending on *who* is running the commit:
- **For AI Agents (Cursor, Windsurf, CI/CD):** Agents usually run headless commands. If they try to \`git commit\` without generating semantic context, aigit detects they lack a TTY and **ruthlessly aborts the commit** with a hard error. This forces AI agents to strictly abide by the rules.
- **For Human Developers:** If *you* type \`git commit\` and forget, aigit detects your live terminal. Instead of blocking you, it pauses the commit inline, asks you for the architectural summary right there in the prompt, processes it seamlessly, and continues the commit without losing your momentum.`
  },
  {
    id: 'core-funnels',
    title: 'Core Capabilities & Funnels',
    content: `### 🎯 Core Capabilities & Funnels

To truly master aigit, you should understand its advanced orchestration paradigms:

#### 📝 Working with Tasks (Agent Handoffs)
When a feature is too complex for a single prompt, you need a task plan.
1. **Create the Task**: \`aigit commit task "Implement User Dashboard"\`  
   This creates both a DB record **and** a plan file at \`.aigit/tasks/implement-user-dashboard.md\` with a pre-filled scaffold (Objective / Sub-tasks / Notes).
2. **Author the Plan**: Open \`.aigit/tasks/{slug}.md\` and fill in the sub-tasks. Your agent can edit it directly like any other file.
3. **Generate the Handoff Block**: Run \`aigit handoff implement-user-dashboard\` to get a copy-paste context block for Agent B — includes task metadata, the plan file inline, last 5 memories, last 5 decisions, and pre-built MCP tool calls with the real project ID.
4. **Update Status**: Keep the ledger in sync as you progress:
\`\`\`bash
aigit update task implement-user-dashboard IN_PROGRESS
aigit update task implement-user-dashboard DONE
# Statuses: PLANNING | IN_PROGRESS | REVIEW | DONE | BLOCKED | CANCELLED
\`\`\`

#### 🐝 Working with Swarm (Multi-Agent Orchestration)
When a task requires disparate domains of expertise simultaneously, you bring in the Swarm.
1. **Initiate Swarm**: Ask your orchestrator or run: \`aigit swarm "Build the JWT authentication middleware"\`
2. **Registration**: Specialized agents (e.g., Backend Architect, Security Auditor) register for the swarm via their MCP tools.
3. **Turn-Taking**: They collaborate sequentially over a local message bus. The Architect builds the schema, then the Security Auditor reviews it for vulnerabilities. 
4. **Resolution**: If the Auditor flags an endpoint as too permissive, the swarm halts. You arbitrate the conflict (\`aigit swarm resolve <id> "Use REST instead"\`), and they resume coding.

#### 🕰️ Searching History (Time-Traveling RAG)
Don't guess *why* something was built a certain way—ask the ledger.
1. **Live Search**: Use \`aigit query "Why did we drop Redux?"\` to fetch the semantic architectural decision.
2. **Time-Traveling**: If checking out an old branch or commit, use \`aigit query "Why auth flow?" --commit a1b2c3d\` to see the context *as it existed* at that specific point in time.
3. **Replaying Scopes**: Run \`aigit replay src/auth/jwt.ts\` to generate a narrative timeline of every architectural decision ever made impacting that specific file.

#### 🏥 Self-Healing & CI Pipelines
Use aigit proactively to prevent bit-rot and handle security vulnerabilities.
1. **Garbage Collection**: Run \`aigit heal\` to detect "Context Drift." aigit will scan your codebase to find and flag architectural decisions tied to files or functions that no longer exist.
2. **Test Driven Healing**: If a test fails on CI or locally, \`aigit heal\` intercepts the stack trace, parses the local AST to find the broken symbol, and queries the ledger to see if this bug occurred before, providing a suggested "Healing Plan."
3. **Dependency Auditing**: Run \`aigit deps --auto\` to automatically branch, audit vulnerable npm packages, cross-reference them with your semantic rules, and auto-commit the safest fixes.

#### 🔄 Universal Agent Synchronization
Stop copy-pasting your \`.cursorrules\` to your teammates.
1. **Initial Scan**: Run \`aigit scan\` to automatically detect all AI tools currently used in the repository (Windsurf, Cline, Cursor, Gemini, Copilot).
2. **Dry Run**: Run \`aigit sync --dry-run\` to compare the underlying rules and memory constraints across all detected text files.
3. **Resolve & Merge**: Run \`aigit sync\`. aigit collapses fragmented rules into \`.aigit/skills\` and bidirectionally synchronizes the constraints down to all local tools, guaranteeing your entire team follows the same architectural master plan.

#### 🛡️ Semantic Security Auditing
Don't let rogue prompts leak secrets or inject vulnerabilities.
1. **Scrubbing**: Run \`aigit dump\`. While serializing your ledger, aigit runs a heuristic scrubbing engine to redact API keys and PII before they hit the tracked json file.
2. **Adversarial Red-Teaming**: Spin up the \`security-auditor\` agent profile. Give it permission to invoke \`audit_semantic_decisions\`. It will hunt your recent context history for prompt injections or weak architectures.
3. **Flagging Issues**: The auditor uses \`flag_vulnerability\` to log warnings directly into the semantic DB, which spawns a blocked task reviewing the security flaw.

#### 🔍 Advanced Graph Queries
Unlock dense relational context through graph queries across your semantic ledger.
1. **Detect Dependencies**: Use \`aigit query <id> --graph deps\` to trace all downstream code files that rely on a specific recorded architecture decision.
2. **Impact Analysis**: When refactoring a core module, use \`aigit replay src/core/index.ts --graph\` to see the blast radius of connected historical tasks and active decisions.
3. **AST Symbol Mapping**: Keep your memories tightly bound. Whenever you do a massive codebase move, run \`aigit anchor .\` to automatically cross-reference all floating memories using exact AST token mapping back to their new line numbers.`
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

### Initialize with the Setup Wizard
Navigate to any git repository and run:
\`\`\`bash
aigit init
\`\`\`

The interactive wizard walks you through every step automatically:

\`\`\`
🚀 aigit — Project Setup Wizard
Setting up semantic memory for your AI coding workflow.

✔ Project detected: my-app — My application
✔ .aigit/ directory ready
✔ Database ready (.aigit/memory.db)
✔ Project created   ID: abc123-...
✔ Git hooks installed (semantic commit enforcement)
✔ .gitignore already excludes memory.db

─────────────────────────────────────────────────
  ✅  aigit initialized! What to do next:
─────────────────────────────────────────────────

1. Add aigit to your AI tool's MCP config
   { mcpServers: { aigit: { command: "aigit", args: ["mcp", "/path/to/project"] } } }

2. Give your agent context on day 1
   Prompt: "Call get_hydrated_context, then commit a memory
            summarizing this codebase's architecture."

3. Track your first task
   $ aigit commit task "My First Feature"
   $ aigit handoff my-first-feature

4. Build your knowledge graph
   $ aigit docs   → ARCHITECTURE.md

Your Project ID: abc123-...
\`\`\`

### Hooks Only (optional)
If you already have a DB and only need to reinstall the git hooks:
\`\`\`bash
aigit init-hook
\`\`\`
This installs native \`pre-commit\`, \`post-checkout\`, and \`pre-push\` hooks.

### Start the MCP Server
Connect aigit to your AI IDE:
\`\`\`bash
# All tools (default)
aigit mcp

# Focused profile — fewer tools, faster routing
aigit mcp --profile core     # semantic memory only
aigit mcp --profile swarm    # multi-agent orchestration
aigit mcp --profile ops      # healing, deps, security
\`\`\`
Then add to Claude Desktop, Cursor, or Windsurf MCP config.`
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
Reconstruct the memory database from \`.aigit/ledger.json\` after a Git pull or clone.

---

### \`aigit note "<message>" [options]\`
Instantly capture a manual context note or architectural decision without waiting for a commit hook. This is the fastest way to record **"why"** from both the CLI and MCP.

\`\`\`bash
# Simple note
❯ aigit note "Redis was too slow, switching to Valkey"
📝 [aigit note] Context captured on branch [main]
   ID: a1b2c3d4-e5f6...

# Architectural decision scoped to a file
❯ aigit note "Chose JWT over sessions" --decision --scope src/auth/jwt.ts
📝 [aigit note] Context captured on branch [main]
   Scope: 📁 src/auth/jwt.ts
   Tag: Architecture Decision

# Link to an external issue tracker
❯ aigit note "Fixed race condition in worker pool" --issue ENG-404
📝 [aigit note] Context captured on branch [main]
   🔗 Issue: ENG-404
\`\`\`

**Options:**
- **\`--decision\`** — Tag this note as an architectural decision.
- **\`--scope <path>\`** — Bind the note to a specific file or directory.
- **\`--issue <ref>\`** — Link to an external issue tracker ID (e.g. Linear, Jira, GitHub).

---

### \`aigit replay <path>\`
Replay the chronological evolution of any file or module. Generates a narrative timeline from the semantic ledger — perfect for onboarding new developers or reviewing how a decision evolved over time.

\`\`\`bash
❯ aigit replay src/auth/jwt.ts
📖 [aigit replay] Evolution of: src/auth/jwt.ts
   3 context entries found.
   ─────────────────────────────────────────────

   📝 [2026-02-28 10:15] [ARCHITECTURE] Chose JWT over sessions
   🔀 [2026-03-01 14:30] Context: Scale to 10k users → Chosen: Add refresh tokens
   📝 [2026-03-04 09:01] [HUMAN_NOTE] Fixed race condition in token rotation

   ─────────────────────────────────────────────
   Timeline spans: 2026-02-28 → 2026-03-04
\`\`\``
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

### Context Drift Detection (Garbage Collection)

Every time you run \`aigit heal\`, it automatically performs a **semantic drift scan** before running tests. This cross-references your semantic ledger against the live workspace to detect stale architectural memories:

- **Deleted files** — Memories anchored to files that no longer exist.
- **Removed AST symbols** — Decisions tied to functions or classes that have been refactored away.
- **Uninstalled dependencies** — Architectural notes referencing libraries no longer in \`package.json\`.

\`\`\`bash
❯ aigit heal
🧹 Context Drift Detected: Found 3 stale architectural memories.
   - [MEMORY] Anchored file deleted: src/old-module.ts
   - [DECISION] Dependency removed: Memory references 'yup' but it is no longer in package.json
   - [MEMORY] Anchored AST symbol deleted: initLegacyDB in src/db.ts
   (Run an interactive AI orchestrator to resolve or mark them as [OBSOLETE])

🧪 Running test suite...
\`\`\`

This prevents AI agents from hallucinating based on outdated decisions and keeps your knowledge base clean.

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
    content: `### MCP Server Profiles
Run the MCP server with a focused subset of tools to reduce noise and improve agent routing:

\`\`\`bash
aigit mcp --profile core    # 13 tools: semantic memory, context, AST
aigit mcp --profile swarm   # 12 tools: multi-agent orchestration
aigit mcp --profile ops     # 8 tools: healing, deps, security
aigit mcp                   # all tools (default)
\`\`\`

### IDE Configuration

Add aigit to your AI IDE's MCP settings (e.g., Claude Desktop, Cursor):

\`\`\`json
{
  "mcpServers": {
    "aigit": {
      "command": "aigit",
      "args": ["mcp", "/path/to/your/project"]
    }
  }
}
\`\`\`

### Available MCP Tools

| Tool | Description |
|------|-------------|
| \`take_note\` | Instantly capture a context note or decision — supports \`issueRef\` for tracker linking |
| \`commit_memory\` | Save a memory — auto-anchors to code symbols if filePath+lineNumber provided |
| \`commit_decision\` | Log a decision — auto-resolves enclosing function/class via AST |
| \`commit_task\` | Create a new task stub — writes DB record + .aigit/tasks/{slug}.md plan file |
| \`get_active_task_state\` | Get all active (non-done) tasks for a project — Agent B's first MCP call on handoff |
| \`get_hydrated_context\` | Get branch-aware, symbol-enriched context prompt |
| \`query_context\` | Semantic search across live project memory |
| \`query_historical\` | Time-travel: query memory at a specific Git commit |
| \`get_symbol_context\` | Get all linked context for a specific code symbol at file+line |
| \`anchor_file\` | Retroactively link memories to code symbols via AST |
| \`list_symbols\` | Extract all functions/classes/methods from a source file |
| \`revert_context\` | Delete a memory, decision, or task by UUID |
| \`check_conflicts\` | Detect semantic conflicts between branches before merging |
| \`merge_context\` | Port context (memories, decisions, tasks) between branches |
| \`scan_agents\` | Detect all AI coding tools configured in the workspace |
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
Cursor, Windsurf, Claude Desktop, Claude Code, Cline/Roo, VS Code with Copilot, and any tool supporting MCP.`
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
    id: 'dashboard-ui',
    title: 'Context Dashboard (UI)',
    content: `### 🧭 Aigit Context Dashboard

Aigit isn't just a CLI—it ships with a fully featured local **Context UI** designed to help you interactively explore, search, and manage your semantic ledger natively in your browser.

Run the API and visual dashboard locally:
\`\`\`bash
aigit ui
\`\`\`

### 📊 Platform Stats
See a live telemetry breakdown of all memories, architecture decisions, active orchestration tasks, and pending Swarm states across your active Git branch.

### 🔍 Semantic Vector Search
Instead of guessing which files impact a specific feature, use the **Semantic Search** tab. This utilizes local Transformers.js vector embeddings to perform ultra-fast RAG operations natively.
- Query: *"Why did we choose Postgres over Redis?"*
- Result: Directly linked AST symbols and origin branches where the architectural decision was explicitly formulated by your AI agent.

### 🕸️ Context Graph (Architecture Dependency Topologies)
The true power of semantic memory is relational context. The **Context Graph** translates your raw \`.aigit/ledger.json\` database into breathtaking **Mermaid.js** visualizations. 
- Map topological relationships between \`Memory\` nodes and structural files.
- Track blast radiuses of code changes using dynamic D3-styled graphs.

### 🧹 Garbage Collection (Admin Settings)
Keep your memory footprint negligible using the embedded DB Vacuum settings.
- Remove orphaned memories associated with deleted origin branches.
- Auto-heal and reconstruct AST scopes that have suffered context drift.`
  },
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

### Agent-Driven Context Generation
Instead of raw git diffs, aigit mandates that AI agents use \`aigit commit memory\` to synthesize semantic, token-efficient summaries of their architectural choices. The \`pre-commit\` hook intelligently detects these memories and orchestrates them into the ledger, completely avoiding payload bloat.

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

const processedSections = sections.map(s => ({ ...s, htmlContent: renderMarkdown(s.content) }));

export function DocsPage() {
  const [activeSection, setActiveSection] = useState('quickstart');
  const current = processedSections.find(s => s.id === activeSection) || processedSections[0];

  return (
    <div className="docs-page">
      <SEO
        title="Documentation"
        description="Learn how to use aigit to synchronize terminal context and coordinate autonomous AI agents in your codebase."
        canonicalUrl="https://aigit.io/docs"
        type="article"
      />
      <aside className="docs-sidebar">
        <div className="docs-sidebar-title">Documentation</div>
        {processedSections.map(s => (
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
          dangerouslySetInnerHTML={{ __html: current.htmlContent }}
        />
      </main>
    </div>
  );
}
