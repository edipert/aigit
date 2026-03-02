import { Task, Memory, Decision } from '@prisma/client';

export function generateMermaidGraph(
    tasks: (Task & { decisions: Decision[] })[],
    memories: Memory[],
    decisions: Decision[]
): string {
    let m = '```mermaid\n';
    m += 'flowchart TD\n\n';
    m += '  %% Nodes\n';

    // 1. Task Nodes
    tasks.forEach(t => {
        const title = t.title.replace(/"/g, "'");
        m += `  Task_${t.id.replace(/-/g, '')}["📋 ${title}"]:::task\n`;
    });

    // 2. Memory Nodes
    memories.forEach(mem => {
        const content = mem.content.substring(0, 40).replace(/"/g, "'") + '...';
        m += `  Mem_${mem.id.replace(/-/g, '')}("🧠 ${content}"):::memory\n`;
    });

    // 3. Decision Nodes
    decisions.forEach(d => {
        const chosen = d.chosen.replace(/"/g, "'");
        m += `  Dec_${d.id.replace(/-/g, '')}{"🧭 ${chosen}"}:::decision\n`;
    });

    m += '\n  %% Causal Links\n';

    // Link Tasks -> Decisions
    tasks.forEach(t => {
        t.decisions.forEach(d => {
            m += `  Task_${t.id.replace(/-/g, '')} -->|Spawned| Dec_${d.id.replace(/-/g, '')}\n`;
        });
    });

    // Link Memories -> Decisions (heuristic: if they share a file/symbol or just generic linkage)
    // For a cleaner graph, let's link Memories to Decisions if they share the same filePath and symbolName
    memories.forEach(mem => {
        if (mem.filePath) {
            const relatedDecisions = decisions.filter(d => d.filePath === mem.filePath && d.symbolName === mem.symbolName);
            relatedDecisions.forEach(d => {
                m += `  Mem_${mem.id.replace(/-/g, '')} -.->|Influenced| Dec_${d.id.replace(/-/g, '')}\n`;
            });
        }
    });

    m += '\n  %% Subgraphs by File Path\n';
    const files = new Set<string>();
    memories.forEach(m => m.filePath && files.add(m.filePath));
    decisions.forEach(d => d.filePath && files.add(d.filePath));

    Array.from(files).forEach((file, i) => {
        m += `  subgraph File${i} ["📁 ${file}"]\n`;
        memories.filter(mem => mem.filePath === file).forEach(mem => {
            m += `    Mem_${mem.id.replace(/-/g, '')}\n`;
        });
        decisions.filter(d => d.filePath === file).forEach(d => {
            m += `    Dec_${d.id.replace(/-/g, '')}\n`;
        });
        m += `  end\n\n`;
    });

    m += '  %% Styling\n';
    m += '  classDef task fill:#4f46e5,stroke:#fff,stroke-width:2px,color:#fff,rx:5,ry:5\n';
    m += '  classDef memory fill:#059669,stroke:#fff,stroke-width:2px,color:#fff,rx:20,ry:20\n';
    m += '  classDef decision fill:#d97706,stroke:#fff,stroke-width:2px,color:#fff\n';

    m += '```\n';
    return m;
}
