import fs from 'fs';
import path from 'path';

export interface AgentTool {
    id: string;
    name: string;
    rulesFiles: string[];
    memoryFiles: string[];
    skillsDir: string | null;
    configDir: string | null;
}

const AGENT_DEFINITIONS: Omit<AgentTool, 'name'>[] & { name: string }[] = [
    {
        id: 'gemini',
        name: 'Google Gemini',
        rulesFiles: ['GEMINI.md', 'AGENTS.md'],
        memoryFiles: ['MEMORY.md'],
        skillsDir: '.agent/skills',
        configDir: '.gemini',
    },
    {
        id: 'claude',
        name: 'Claude Code',
        rulesFiles: ['CLAUDE.md'],
        memoryFiles: ['CLAUDE.md'],
        skillsDir: '.claude/skills',
        configDir: '.claude',
    },
    {
        id: 'cursor',
        name: 'Cursor',
        rulesFiles: ['.cursorrules'],
        memoryFiles: ['.cursorrules'],
        skillsDir: '.cursor/skills',
        configDir: '.cursor',
    },
    {
        id: 'cline',
        name: 'Cline / Roo',
        rulesFiles: ['.clinerules'],
        memoryFiles: ['.clinerules'],
        skillsDir: '.cline/skills',
        configDir: '.cline',
    },
    {
        id: 'windsurf',
        name: 'Windsurf',
        rulesFiles: ['.windsurfrules'],
        memoryFiles: ['.windsurfrules'],
        skillsDir: '.windsurf/skills',
        configDir: null,
    },
    {
        id: 'copilot',
        name: 'GitHub Copilot',
        rulesFiles: ['.github/copilot-instructions.md'],
        memoryFiles: ['.github/copilot-instructions.md'],
        skillsDir: '.github/copilot-instructions/skills',
        configDir: '.github',
    },
    {
        id: 'codex',
        name: 'OpenAI Codex',
        rulesFiles: ['CODEX.md', 'codex.md'],
        memoryFiles: ['CODEX.md', 'codex.md'],
        skillsDir: null,
        configDir: null,
    },
    {
        id: 'aider',
        name: 'Aider',
        rulesFiles: ['.aider.conf.yml', 'CONVENTIONS.md'],
        memoryFiles: ['CONVENTIONS.md'],
        skillsDir: null,
        configDir: '.aider',
    },
];

export interface DetectedAgent {
    tool: AgentTool;
    foundFiles: string[];
    rulesContent: { file: string; content: string }[];
}

/**
 * Scan a workspace and return all detected AI coding tools.
 */
export function detectAgents(workspacePath: string): DetectedAgent[] {
    const detected: DetectedAgent[] = [];

    for (const def of AGENT_DEFINITIONS) {
        const foundFiles: string[] = [];
        const rulesContent: { file: string; content: string }[] = [];

        // Check rules files (skip directories)
        for (const rf of def.rulesFiles) {
            const fullPath = path.join(workspacePath, rf);
            if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
                foundFiles.push(rf);
                try {
                    rulesContent.push({ file: rf, content: fs.readFileSync(fullPath, 'utf8') });
                } catch { /* unreadable, skip */ }
            }
        }

        // Check memory files (may overlap with rules, skip directories)
        for (const mf of def.memoryFiles) {
            const fullPath = path.join(workspacePath, mf);
            if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile() && !foundFiles.includes(mf)) {
                foundFiles.push(mf);
            }
        }

        // Check config dir
        if (def.configDir) {
            const cfgPath = path.join(workspacePath, def.configDir);
            if (fs.existsSync(cfgPath)) {
                foundFiles.push(def.configDir + '/');
            }
        }

        // Check skills dir
        if (def.skillsDir) {
            const skillPath = path.join(workspacePath, def.skillsDir);
            if (fs.existsSync(skillPath)) {
                foundFiles.push(def.skillsDir + '/');
            }
        }

        if (foundFiles.length > 0) {
            detected.push({ tool: def, foundFiles, rulesContent });
        }
    }

    return detected;
}

/**
 * Pretty-print the scan results to the console.
 */
export function printScanReport(agents: DetectedAgent[]): void {
    if (agents.length === 0) {
        console.log('\n🔍 No AI coding tools detected in this workspace.\n');
        return;
    }

    console.log(`\n🔍 [aigit scan] Detected ${agents.length} AI tool(s):\n`);
    for (const a of agents) {
        const fileList = a.foundFiles.map(f => `    • ${f}`).join('\n');
        console.log(`  🤖 ${a.tool.name} (${a.tool.id})`);
        console.log(fileList);
        console.log();
    }
}
