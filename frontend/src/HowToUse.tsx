import { useState } from 'react';

interface Command {
    name: string;
    command: string;
    desc: string;
    category: string;
}

const commands: Command[] = [
    // Core
    { name: 'init', command: 'aigit init', desc: 'Initialize aigit in your repo — hooks + .aigit/ directory.', category: 'core' },
    { name: 'hydrate', command: 'aigit hydrate', desc: 'Build a minimal context prompt tailored to your branch and active file.', category: 'core' },
    { name: 'dump', command: 'aigit dump', desc: 'Serialize the memory DB to .aigit/ledger.json for Git tracking.', category: 'core' },
    { name: 'load', command: 'aigit load', desc: 'Rebuild the memory DB from .aigit/ledger.json after a Git pull.', category: 'core' },
    // Git Context
    { name: 'log', command: 'aigit log', desc: 'View semantic memory timeline partitioned by your active branch.', category: 'git' },
    { name: 'status', command: 'aigit status', desc: 'Show pending AI tasks and active context state.', category: 'git' },
    { name: 'revert', command: 'aigit revert <id>', desc: 'Remove a specific memory entry or abort an ongoing task.', category: 'git' },
    { name: 'check-conflicts', command: 'aigit check-conflicts main', desc: 'Detect semantic conflicts between branches before merging.', category: 'git' },
    { name: 'merge', command: 'aigit merge feature/auth main', desc: 'Port architectural decisions from one branch to another.', category: 'git' },
    // Agent Sync
    { name: 'scan', command: 'aigit scan', desc: 'Auto-detect all AI tools in your workspace (Gemini, Claude, Cursor…).', category: 'sync' },
    { name: 'sync', command: 'aigit sync', desc: 'Bidirectional sync of rules and memory across all detected tools.', category: 'sync' },
    { name: 'sync --dry-run', command: 'aigit sync --dry-run', desc: 'Preview what sections would be synced without writing files.', category: 'sync' },
    { name: 'conflicts', command: 'aigit conflicts', desc: 'Show unresolved rule conflicts blocking sync.', category: 'sync' },
    // RAG & Deep Linking
    { name: 'anchor', command: 'aigit anchor <file>', desc: 'Retroactively link existing memories to code symbols (functions, classes) via AST extraction.', category: 'rag' },
    { name: 'query', command: 'aigit query "Why Redis?"', desc: 'Semantic search across your project memory — finds relevant decisions and context.', category: 'rag' },
    { name: 'time-travel', command: 'aigit query "X" --commit abc', desc: 'Query memory as it existed at a past Git commit. Ask why decisions were made historically.', category: 'rag' },
    // Swarm Orchestration
    { name: 'swarm', command: 'aigit swarm "Build auth module"', desc: 'Create a multi-agent swarm session. Agents register, take turns, and collaborate on the goal.', category: 'swarm' },
    { name: 'swarm status', command: 'aigit swarm status', desc: 'View all active swarms — agents, turns, messages, and conflict state.', category: 'swarm' },
    { name: 'swarm halt', command: 'aigit swarm halt <id>', desc: 'Pause an active swarm. All agents stop taking turns until resumed.', category: 'swarm' },
    { name: 'swarm resume', command: 'aigit swarm resume <id>', desc: 'Resume a halted swarm and allow agents to continue their turns.', category: 'swarm' },
    { name: 'swarm conflicts', command: 'aigit swarm conflicts', desc: 'List unresolved conflicts flagged by agents — auto-halts the swarm until resolved.', category: 'swarm' },
    { name: 'swarm resolve', command: 'aigit swarm resolve <id> "Use REST"', desc: 'Resolve a swarm conflict with your decision and resume the session.', category: 'swarm' },
    // Self-Healing Codebases
    { name: 'heal', command: 'aigit heal', desc: 'Run tests, diagnose any failures via AST, and propose contextual fixes.', category: 'heal' },
    { name: 'heal --auto', command: 'aigit heal --auto', desc: 'Run tests and automatically commit AI-generated fixes for failing tests.', category: 'heal' },
    { name: 'heal status', command: 'aigit heal status', desc: 'View the history of recent self-healing events and their status.', category: 'heal' },
    { name: 'deps', command: 'aigit deps', desc: 'Audit npm dependencies, classify vulnerabilities, and propose semantic updates.', category: 'heal' },
    { name: 'deps --auto', command: 'aigit deps --auto', desc: 'Automatically branch, fix vulnerabilities, and commit the dependency updates.', category: 'heal' },
    // Semantic Security
    { name: 'dump (scrubbed)', command: 'aigit dump', desc: 'Serialize memory to ledger.json, automatically redacting API keys, JWTs, and PII.', category: 'security' },
    { name: 'audit tools', command: 'MCP Tools', desc: 'security-auditor agent uses audit_semantic_decisions and flag_vulnerability.', category: 'security' },
    // Documentation
    { name: 'docs', command: 'aigit docs', desc: 'Generate ARCHITECTURE.md and a Mermaid DAG dynamically from your semantic memory.', category: 'docs' },
];

const categories = [
    { id: 'all', label: 'All' },
    { id: 'core', label: 'Core' },
    { id: 'git', label: 'Git Context' },
    { id: 'sync', label: 'Agent Sync' },
    { id: 'rag', label: 'RAG & Search' },
    { id: 'swarm', label: 'Swarm' },
    { id: 'heal', label: 'Self-Healing' },
    { id: 'security', label: 'Security' },
    { id: 'docs', label: 'Documentation' },
];

export function HowToUse() {
    const [filter, setFilter] = useState('all');
    const [expanded, setExpanded] = useState<string | null>(null);

    const filtered = filter === 'all' ? commands : commands.filter(c => c.category === filter);

    return (
        <section className="how-to-section">
            <div className="section-header">
                <h2>SYS.WORKFLOW</h2>
                <div className="section-divider"></div>
            </div>

            <div className="workflow-pills">
                {categories.map(cat => (
                    <button
                        key={cat.id}
                        className={`pill ${filter === cat.id ? 'active' : ''}`}
                        onClick={() => { setFilter(cat.id); setExpanded(null); }}
                    >
                        {cat.label}
                    </button>
                ))}
            </div>

            <div className="cmd-grid">
                {filtered.map(cmd => (
                    <div
                        key={cmd.name}
                        className={`cmd-card ${expanded === cmd.name ? 'expanded' : ''}`}
                        onClick={() => setExpanded(expanded === cmd.name ? null : cmd.name)}
                    >
                        <div className="cmd-card-header">
                            <span className={`cmd-badge ${cmd.category}`}>{cmd.category}</span>
                            <h3 className="cmd-name">{cmd.name}</h3>
                        </div>
                        <div className="cmd-terminal-inline">
                            <span className="prompt">❯</span>
                            <span className="command">{cmd.command}</span>
                        </div>
                        <p className="cmd-desc">{cmd.desc}</p>
                    </div>
                ))}
            </div>

            <div className="workflow-cta">
                <a href="/docs" className="docs-link">Full Documentation →</a>
            </div>
        </section>
    );
}
