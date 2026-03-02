"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncAgents = syncAgents;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const registry_1 = require("./registry");
const parsers_1 = require("./parsers");
const conflicts_1 = require("./conflicts");
/**
 * Run a full sync cycle: scan → parse → diff → apply.
 */
function syncAgents(workspacePath, options = {}) {
    const agents = (0, registry_1.detectAgents)(workspacePath);
    if (agents.length < 2) {
        console.log('\n⚡ Only one AI tool detected. Nothing to sync.\n');
        return { diffs: [], conflictCount: 0 };
    }
    // Filter by --from/--to if specified
    let sourceAgents = agents;
    let targetAgents = agents;
    if (options.from) {
        sourceAgents = agents.filter(a => a.tool.id === options.from);
        if (sourceAgents.length === 0) {
            console.error(`❌ Source tool "${options.from}" not found in this workspace.`);
            return { diffs: [], conflictCount: 0 };
        }
    }
    if (options.to) {
        targetAgents = agents.filter(a => a.tool.id === options.to);
        if (targetAgents.length === 0) {
            console.error(`❌ Target tool "${options.to}" not found in this workspace.`);
            return { diffs: [], conflictCount: 0 };
        }
    }
    // Step 1: Parse all tool files into sections
    const parsedByTool = [];
    for (const agent of agents) {
        const allSections = [];
        for (const rc of agent.rulesContent) {
            const sections = (0, parsers_1.autoparse)(rc.content, rc.file);
            allSections.push(...sections);
        }
        parsedByTool.push({ toolId: agent.tool.id, sections: allSections });
    }
    // Step 2: Detect conflicts
    const conflicts = (0, conflicts_1.detectConflicts)(parsedByTool);
    if (conflicts.length > 0) {
        (0, conflicts_1.printConflicts)(conflicts);
        (0, conflicts_1.saveConflicts)(workspacePath, conflicts);
        console.log('  ⛔ Sync blocked. Resolve conflicts first.\n');
        return { diffs: [], conflictCount: conflicts.length };
    }
    // Step 3: Build union of all headings
    const allHeadings = new Map();
    for (const { toolId, sections } of parsedByTool) {
        // Only pick from source agents
        if (options.from && toolId !== options.from)
            continue;
        for (const section of sections) {
            const key = section.heading.toLowerCase().trim();
            if (!allHeadings.has(key)) {
                allHeadings.set(key, { toolId, section });
            }
        }
    }
    // Step 4: Diff — find what's missing in each target tool
    const diffs = [];
    for (const targetAgent of targetAgents) {
        // Skip if target is same as source in one-directional mode
        if (options.from && targetAgent.tool.id === options.from)
            continue;
        const targetParsed = parsedByTool.find(p => p.toolId === targetAgent.tool.id);
        const existingHeadings = new Set(targetParsed?.sections.map(s => s.heading.toLowerCase().trim()) || []);
        for (const [key, { toolId: sourceToolId, section }] of allHeadings) {
            if (existingHeadings.has(key)) {
                diffs.push({
                    toolId: targetAgent.tool.id,
                    file: targetAgent.tool.rulesFiles[0],
                    action: 'skip',
                    heading: section.heading,
                    content: '',
                });
            }
            else {
                diffs.push({
                    toolId: targetAgent.tool.id,
                    file: targetAgent.tool.rulesFiles[0],
                    action: 'add',
                    heading: section.heading,
                    content: section.content,
                });
            }
        }
    }
    const additions = diffs.filter(d => d.action === 'add');
    if (additions.length === 0) {
        console.log('\n✅ All tools are already in sync. No changes needed.\n');
        return { diffs, conflictCount: 0 };
    }
    // Step 5: Apply (or dry-run)
    console.log(`\n🔄 [aigit sync] ${options.dryRun ? 'DRY RUN — ' : ''}${additions.length} section(s) to sync:\n`);
    // Group additions by target file
    const groupedByFile = new Map();
    for (const diff of additions) {
        const fullKey = `${diff.toolId}:${diff.file}`;
        if (!groupedByFile.has(fullKey))
            groupedByFile.set(fullKey, []);
        groupedByFile.get(fullKey).push(diff);
    }
    for (const [key, fileDiffs] of groupedByFile) {
        const [toolId, file] = key.split(':');
        console.log(`  → [${toolId}] ${file}`);
        for (const diff of fileDiffs) {
            console.log(`    + "${diff.heading}"`);
        }
        if (!options.dryRun) {
            const fullPath = path_1.default.join(workspacePath, file);
            const existingContent = fs_1.default.existsSync(fullPath) ? fs_1.default.readFileSync(fullPath, 'utf8') : '';
            let appended = '\n\n# --- Synced by aigit ---\n\n';
            for (const diff of fileDiffs) {
                appended += `## ${diff.heading}\n\n${diff.content}\n\n`;
            }
            fs_1.default.writeFileSync(fullPath, existingContent + appended, 'utf8');
        }
        console.log();
    }
    if (options.dryRun) {
        console.log('  (dry run — no files were changed)\n');
    }
    else {
        console.log('  ✅ Sync complete.\n');
    }
    return { diffs, conflictCount: 0 };
}
