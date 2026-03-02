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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.compileHydratedContext = compileHydratedContext;
const path_1 = __importDefault(require("path"));
const git_1 = require("./git");
const environment_1 = require("./environment");
const db_1 = require("../db");
const registry_1 = require("../agents/registry");
async function compileHydratedContext(workspacePath, activeFile) {
    let payload = '';
    // Detect ALL AI tool config files (Gemini, Claude, Cursor, Cline, Codex, Windsurf, Copilot, Aider)
    const agents = (0, registry_1.detectAgents)(workspacePath);
    if (agents.length > 0) {
        // Collect all unique rules content across detected tools
        const ingested = [];
        for (const agent of agents) {
            for (const rc of agent.rulesContent) {
                payload += `# ${agent.tool.name} — ${rc.file}\n\n`;
                payload += rc.content + '\n\n';
                ingested.push(`${agent.tool.name}/${rc.file}`);
            }
        }
        payload += `> 🔍 aigit hydrate: Ingested ${ingested.length} rule file(s) from ${agents.length} AI tool(s): ${agents.map(a => a.tool.name).join(', ')}\n\n`;
    }
    else {
        payload += '# AIGIT CONTEXT AUTOMATION\n\n> No AI tool config files detected (checked AGENTS.md, GEMINI.md, CLAUDE.md, .cursorrules, .clinerules, CODEX.md, .windsurfrules, copilot-instructions.md, .aider.conf.yml, CONVENTIONS.md).\n\n';
    }
    payload += '## CURRENT ENVIRONMENT\n';
    payload += `- **Git Branch**: ${(0, git_1.getActiveBranch)(workspacePath)}\n`;
    const changed = (0, git_1.getChangedFiles)(workspacePath);
    if (changed.length > 0) {
        payload += `- **Changed Files**: ${changed.slice(0, 5).join(', ')}${changed.length > 5 ? '...' : ''}\n`;
    }
    const projectType = (0, environment_1.detectProjectType)(workspacePath);
    payload += `- **Detected Project Type**: ${projectType}\n`;
    if (activeFile) {
        payload += `- **Active File**: ${activeFile}\n`;
    }
    payload += '\n';
    // Phase 23: AST-Anchored Context Retrieval
    if (activeFile) {
        try {
            const relPath = path_1.default.relative(workspacePath, activeFile);
            const { extractAllSymbols } = await Promise.resolve().then(() => __importStar(require('../ast/resolver')));
            // Extract symbols from the active file
            const symbols = extractAllSymbols(activeFile);
            const symbolNames = symbols.map(s => s.qualifiedName);
            // Query by symbol name (deep link) + fallback to filePath
            const symbolWhere = symbolNames.length > 0
                ? { OR: [{ symbolName: { in: symbolNames } }, { filePath: { contains: relPath } }] }
                : { filePath: { contains: relPath } };
            const [anchoredMemories, anchoredDecisions] = await Promise.all([
                db_1.prisma.memory.findMany({ where: symbolWhere, orderBy: { createdAt: 'desc' }, take: 15 }),
                db_1.prisma.decision.findMany({ where: symbolWhere, orderBy: { createdAt: 'desc' }, take: 15 }),
            ]);
            if (anchoredMemories.length > 0 || anchoredDecisions.length > 0) {
                payload += `## 📌 FILE-ANCHORED CONTEXT (${relPath})\n`;
                for (const m of anchoredMemories) {
                    const anchor = m.symbolName ? `@${m.symbolName}` : (m.lineNumber ? `L${m.lineNumber}` : '');
                    payload += `- [MEMORY ${anchor}] ${m.content}\n`;
                }
                for (const d of anchoredDecisions) {
                    const anchor = d.symbolName ? `@${d.symbolName}` : (d.lineNumber ? `L${d.lineNumber}` : '');
                    payload += `- [DECISION ${anchor}] ${d.context} ➔ ${d.chosen}\n`;
                }
                payload += '\n';
            }
        }
        catch {
            // DB may not be initialized yet, gracefully skip
        }
    }
    payload += `## CONTEXT HYDRATION\n`;
    payload += `The environment features above have been auto-detected. Please follow the rules and protocols from the ingested AI tool configuration files and target your execution accordingly.\n`;
    return payload;
}
