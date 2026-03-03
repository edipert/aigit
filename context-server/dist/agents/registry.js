"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectAgents = detectAgents;
exports.printScanReport = printScanReport;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const AGENT_DEFINITIONS = [
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
/**
 * Scan a workspace and return all detected AI coding tools.
 */
function detectAgents(workspacePath) {
    const detected = [];
    for (const def of AGENT_DEFINITIONS) {
        const foundFiles = [];
        const rulesContent = [];
        // Check rules files (skip directories)
        for (const rf of def.rulesFiles) {
            const fullPath = path_1.default.join(workspacePath, rf);
            if (fs_1.default.existsSync(fullPath) && fs_1.default.statSync(fullPath).isFile()) {
                foundFiles.push(rf);
                try {
                    rulesContent.push({ file: rf, content: fs_1.default.readFileSync(fullPath, 'utf8') });
                }
                catch { /* unreadable, skip */ }
            }
        }
        // Check memory files (may overlap with rules, skip directories)
        for (const mf of def.memoryFiles) {
            const fullPath = path_1.default.join(workspacePath, mf);
            if (fs_1.default.existsSync(fullPath) && fs_1.default.statSync(fullPath).isFile() && !foundFiles.includes(mf)) {
                foundFiles.push(mf);
            }
        }
        // Check config dir
        if (def.configDir) {
            const cfgPath = path_1.default.join(workspacePath, def.configDir);
            if (fs_1.default.existsSync(cfgPath)) {
                foundFiles.push(def.configDir + '/');
            }
        }
        // Check skills dir
        if (def.skillsDir) {
            const skillPath = path_1.default.join(workspacePath, def.skillsDir);
            if (fs_1.default.existsSync(skillPath)) {
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
function printScanReport(agents) {
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
