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

import fs from 'fs';
import path from 'path';
import { prisma, initializeDatabase } from '../../db';
import { installGitHook } from '../hooks';
import { spinner, ok, warn, info, c } from '../output';
import type { CommandHandler } from './types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function detectProjectName(workspacePath: string): string {
    const pkgPath = path.join(workspacePath, 'package.json');
    if (fs.existsSync(pkgPath)) {
        try {
            const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
            if (pkg.name) return pkg.name;
        } catch { /* fallback */ }
    }
    return path.basename(workspacePath);
}

function detectProjectDescription(workspacePath: string): string | null {
    const pkgPath = path.join(workspacePath, 'package.json');
    if (fs.existsSync(pkgPath)) {
        try {
            const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
            return pkg.description ?? null;
        } catch { /* ignore */ }
    }
    return null;
}

function detectAigitBinary(): string {
    const local = path.join(process.cwd(), 'node_modules', '.bin', 'aigit');
    if (fs.existsSync(local)) return local;
    return 'aigit';
}

function mcpConfigJson(workspacePath: string, binary: string): string {
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

const handler: CommandHandler = async ({ workspacePath }) => {
    const aigitDir = path.join(workspacePath, '.aigit');
    const alreadyInit = fs.existsSync(aigitDir) && fs.existsSync(path.join(aigitDir, 'memory.db'));

    console.log();
    console.log(c.bold('🚀 aigit — Project Setup Wizard'));
    console.log(c.muted('Setting up semantic memory for your AI coding workflow.\n'));

    // ── Step 1: Detect project info ───────────────────────────────────────────
    const s1 = spinner('Detecting project info…');
    await new Promise(r => setTimeout(r, 250));
    const projectName = detectProjectName(workspacePath);
    const projectDescription = detectProjectDescription(workspacePath);
    s1.succeed(`Project detected: ${c.highlight(projectName)}${projectDescription ? c.muted(' — ' + projectDescription) : ''}`);

    if (alreadyInit) {
        warn('This project already has a .aigit/ directory — memory will be preserved.\n');
    }

    // ── Step 2: Create .aigit/ directory ─────────────────────────────────────
    const s2 = spinner('Creating .aigit/ directory…');
    await new Promise(r => setTimeout(r, 200));
    if (!fs.existsSync(aigitDir)) fs.mkdirSync(aigitDir, { recursive: true });
    const tasksDir = path.join(aigitDir, 'tasks');
    if (!fs.existsSync(tasksDir)) fs.mkdirSync(tasksDir, { recursive: true });
    s2.succeed('.aigit/ directory ready');

    // ── Step 3: Initialize DB ─────────────────────────────────────────────────
    const s3 = spinner('Initializing semantic memory database…');
    await initializeDatabase();
    s3.succeed('Database ready (.aigit/memory.db)');

    // ── Step 4: Create default project ────────────────────────────────────────
    const s4 = spinner(`Creating project "${projectName}" in memory DB…`);
    let project = await prisma.project.findFirst({ where: { name: projectName } });
    if (!project) {
        project = await prisma.project.create({
            data: {
                id: crypto.randomUUID(),
                name: projectName,
                description: projectDescription ?? undefined,
                updatedAt: new Date(),
            },
        });
        s4.succeed(`Project created   ${c.id('ID: ' + project.id)}`);
    } else {
        s4.succeed(`Project exists    ${c.id('ID: ' + project.id)}`);
    }

    // ── Step 5: Install git hooks ─────────────────────────────────────────────
    const s5 = spinner('Installing git hooks…');
    await new Promise(r => setTimeout(r, 200));
    try {
        installGitHook(workspacePath);
        s5.succeed('Git hooks installed (semantic commit enforcement)');
    } catch {
        s5.warn('Git hooks skipped (no .git directory found)');
    }

    // ── Step 6: .gitignore check ──────────────────────────────────────────────
    const s6 = spinner('Checking .gitignore…');
    await new Promise(r => setTimeout(r, 150));
    const gitignorePath = path.join(workspacePath, '.gitignore');
    const gitignoreContent = fs.existsSync(gitignorePath) ? fs.readFileSync(gitignorePath, 'utf8') : '';
    if (gitignoreContent.includes('memory.db') || gitignoreContent.includes('.aigit/memory.db')) {
        s6.succeed('.gitignore already excludes memory.db');
    } else {
        s6.warn(`.gitignore: add ${c.warn('.aigit/memory.db')} to avoid committing your memory database`);
    }

    // ── What's Next ───────────────────────────────────────────────────────────
    const binary = detectAigitBinary();
    const claudeConfigPath = process.platform === 'darwin'
        ? '~/Library/Application Support/Claude/claude_desktop_config.json'
        : '%APPDATA%\\Claude\\claude_desktop_config.json';

    console.log();
    console.log(c.bold('─────────────────────────────────────────────────────────'));
    console.log(c.bold('  ✅  aigit initialized! What to do next:'));
    console.log(c.bold('─────────────────────────────────────────────────────────'));

    console.log(`
${c.bold('1. Add aigit to your AI tool\'s MCP config')}

   ${c.info('Claude Desktop')} → ${c.muted(claudeConfigPath)}
${c.muted(mcpConfigJson(workspacePath, binary).split('\n').map(l => '   ' + l).join('\n'))}

   ${c.info('Cursor / Windsurf / Cline')}:
   ${c.muted('command:')} ${c.muted(binary)}
   ${c.muted('args: ["mcp", "' + workspacePath + '"]')}

${c.bold('2. Give your agent context on day 1')}

   ${c.muted('Prompt: "Call get_hydrated_context, then commit a memory')}
   ${c.muted('         summarizing this codebase\'s architecture."')}

${c.bold('3. Track your first task')}

   ${c.muted('$ aigit commit task "My First Feature"')}
   ${c.muted('$ aigit update task my-first-feature IN_PROGRESS')}
   ${c.muted('$ aigit handoff my-first-feature    # hand off to next agent')}

${c.bold('4. Build your knowledge graph')}

   ${c.muted('$ aigit commit memory "Key architectural choice..."')}
   ${c.muted('$ aigit docs                        # → ARCHITECTURE.md')}

${c.bold('Your Project ID')} (save this — you\'ll use it in MCP tool calls):
   ${c.highlight(project.id)}
`);

    info('Run `aigit --help` to see all available commands.');
    console.log();
};

export default handler;
