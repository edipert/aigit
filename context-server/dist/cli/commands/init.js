"use strict";
/**
 * aigit init
 *
 * Interactive setup wizard for new aigit projects.
 * - Detects project name from package.json or directory name
 * - Creates .aigit/ directory and initializes the database
 * - Creates the default project record in semantic memory DB
 * - Installs git hooks (pre-commit semantic enforcement)
 * - Prints MCP config snippets for Claude / Cursor / Windsurf / Cline
 * - Shows a "What's next" summary
 */
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
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const db_1 = require("../../db");
const hooks_1 = require("../hooks");
const output_1 = require("../output");
// ── Helpers ───────────────────────────────────────────────────────────────────
function detectProjectName(workspacePath) {
    const pkgPath = path_1.default.join(workspacePath, 'package.json');
    if (fs_1.default.existsSync(pkgPath)) {
        try {
            const pkg = JSON.parse(fs_1.default.readFileSync(pkgPath, 'utf8'));
            if (pkg.name)
                return pkg.name;
        }
        catch { /* fallback */ }
    }
    return path_1.default.basename(workspacePath);
}
function detectProjectDescription(workspacePath) {
    const pkgPath = path_1.default.join(workspacePath, 'package.json');
    if (fs_1.default.existsSync(pkgPath)) {
        try {
            const pkg = JSON.parse(fs_1.default.readFileSync(pkgPath, 'utf8'));
            return pkg.description ?? null;
        }
        catch { /* ignore */ }
    }
    return null;
}
function detectAigitBinary() {
    const local = path_1.default.join(process.cwd(), 'node_modules', '.bin', 'aigit');
    if (fs_1.default.existsSync(local))
        return local;
    return 'aigit';
}
function mcpConfigJson(workspacePath, binary) {
    return JSON.stringify({
        mcpServers: {
            aigit: {
                command: binary,
                args: ['mcp', workspacePath],
            },
        },
    }, null, 2);
}
// ── Main handler ──────────────────────────────────────────────────────────────
const handler = async ({ workspacePath }) => {
    const aigitDir = path_1.default.join(workspacePath, '.aigit');
    const alreadyInit = fs_1.default.existsSync(aigitDir) && fs_1.default.existsSync(path_1.default.join(aigitDir, 'memory.db'));
    console.log();
    console.log(output_1.c.bold('🚀 aigit — Project Setup Wizard'));
    console.log(output_1.c.muted('Setting up semantic memory for your AI coding workflow.\n'));
    // ── Step 1: Detect project info ───────────────────────────────────────────
    const s1 = (0, output_1.spinner)('Detecting project info…');
    await new Promise(r => setTimeout(r, 250));
    const projectName = detectProjectName(workspacePath);
    const projectDescription = detectProjectDescription(workspacePath);
    s1.succeed(`Project detected: ${output_1.c.highlight(projectName)}${projectDescription ? output_1.c.muted(' — ' + projectDescription) : ''}`);
    if (alreadyInit) {
        (0, output_1.warn)('This project already has a .aigit/ directory — memory will be preserved.\n');
    }
    // ── Step 2: Create .aigit/ directory ─────────────────────────────────────
    const s2 = (0, output_1.spinner)('Creating .aigit/ directory…');
    await new Promise(r => setTimeout(r, 200));
    if (!fs_1.default.existsSync(aigitDir))
        fs_1.default.mkdirSync(aigitDir, { recursive: true });
    const tasksDir = path_1.default.join(aigitDir, 'tasks');
    if (!fs_1.default.existsSync(tasksDir))
        fs_1.default.mkdirSync(tasksDir, { recursive: true });
    s2.succeed('.aigit/ directory ready');
    // ── Step 3: Initialize DB ─────────────────────────────────────────────────
    const s3 = (0, output_1.spinner)('Initializing semantic memory database…');
    await (0, db_1.initializeDatabase)();
    // Proactively load existing ledger if the DB was just created fresh
    const ledgerPath = path_1.default.join(aigitDir, 'ledger.json');
    if (fs_1.default.existsSync(ledgerPath)) {
        const { loadContextLedger } = await Promise.resolve().then(() => __importStar(require('../sync')));
        await loadContextLedger(workspacePath);
        s3.succeed('Database ready (Restored from existing ledger.json)');
    }
    else {
        s3.succeed('Database ready (.aigit/memory.db)');
    }
    // ── Step 4: Create default project ────────────────────────────────────────
    const s4 = (0, output_1.spinner)(`Creating project "${projectName}" in memory DB…`);
    let project = await db_1.prisma.project.findFirst({ where: { name: projectName } });
    if (!project) {
        project = await db_1.prisma.project.create({
            data: {
                id: crypto.randomUUID(),
                name: projectName,
                description: projectDescription ?? undefined,
                updatedAt: new Date(),
            },
        });
        s4.succeed(`Project created   ${output_1.c.id('ID: ' + project.id)}`);
    }
    else {
        s4.succeed(`Project exists    ${output_1.c.id('ID: ' + project.id)}`);
    }
    // ── Step 5: Install git hooks ─────────────────────────────────────────────
    const s5 = (0, output_1.spinner)('Installing git hooks…');
    await new Promise(r => setTimeout(r, 200));
    try {
        (0, hooks_1.installGitHook)(workspacePath);
        s5.succeed('Git hooks installed (semantic commit enforcement)');
    }
    catch {
        s5.warn('Git hooks skipped (no .git directory found)');
    }
    // ── Step 6: .gitignore check ──────────────────────────────────────────────
    const s6 = (0, output_1.spinner)('Checking .gitignore…');
    await new Promise(r => setTimeout(r, 150));
    const gitignorePath = path_1.default.join(workspacePath, '.gitignore');
    const gitignoreContent = fs_1.default.existsSync(gitignorePath) ? fs_1.default.readFileSync(gitignorePath, 'utf8') : '';
    if (gitignoreContent.includes('memory.db') || gitignoreContent.includes('.aigit/memory.db')) {
        s6.succeed('.gitignore already excludes memory.db');
    }
    else {
        s6.warn(`.gitignore: add ${output_1.c.warn('.aigit/memory.db')} to avoid committing your memory database`);
    }
    // ── What's Next ───────────────────────────────────────────────────────────
    const binary = detectAigitBinary();
    const claudeConfigPath = process.platform === 'darwin'
        ? '~/Library/Application Support/Claude/claude_desktop_config.json'
        : '%APPDATA%\\Claude\\claude_desktop_config.json';
    console.log();
    console.log(output_1.c.bold('─────────────────────────────────────────────────────────'));
    console.log(output_1.c.bold('  ✅  aigit initialized! What to do next:'));
    console.log(output_1.c.bold('─────────────────────────────────────────────────────────'));
    console.log(`
${output_1.c.bold('1. Add aigit to your AI tool\'s MCP config')}

   ${output_1.c.info('Claude Desktop')} → ${output_1.c.muted(claudeConfigPath)}
${output_1.c.muted(mcpConfigJson(workspacePath, binary).split('\n').map(l => '   ' + l).join('\n'))}

   ${output_1.c.info('Cursor / Windsurf / Cline')}:
   ${output_1.c.muted('command:')} ${output_1.c.muted(binary)}
   ${output_1.c.muted('args: ["mcp", "' + workspacePath + '"]')}

${output_1.c.bold('2. Give your agent context on day 1')}

   ${output_1.c.muted('Prompt: "Call get_hydrated_context, then commit a memory')}
   ${output_1.c.muted('         summarizing this codebase\'s architecture."')}

${output_1.c.bold('3. Track your first task')}

   ${output_1.c.muted('$ aigit commit task "My First Feature"')}
   ${output_1.c.muted('$ aigit update task my-first-feature IN_PROGRESS')}
   ${output_1.c.muted('$ aigit handoff my-first-feature    # hand off to next agent')}

${output_1.c.bold('4. Build your knowledge graph')}

   ${output_1.c.muted('$ aigit commit memory "Key architectural choice..."')}
   ${output_1.c.muted('$ aigit docs                        # → ARCHITECTURE.md')}

${output_1.c.bold('Your Project ID')} (save this — you\'ll use it in MCP tool calls):
   ${output_1.c.highlight(project.id)}
`);
    (0, output_1.info)('Run `aigit --help` to see all available commands.');
    console.log();
};
exports.default = handler;
