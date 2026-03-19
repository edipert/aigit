import fs from 'fs';
import path from 'path';
import { detectAgents, DetectedAgent } from './registry';
import { autoparse, RuleSection } from './parsers';
import { detectConflicts, saveConflicts, printConflicts } from './conflicts';

interface SyncDiff {
    toolId: string;
    file: string;
    action: 'add' | 'skip';
    heading: string;
    content: string;
}

interface SyncResult {
    diffs: SyncDiff[];
    conflictCount: number;
}

/**
 * Run a full sync cycle: scan → parse → diff → apply.
 */
export async function syncAgents(
    workspacePath: string,
    options: { dryRun?: boolean; from?: string; to?: string } = {}
): Promise<SyncResult> {
    const agents = detectAgents(workspacePath);

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
    const parsedByTool: { toolId: string; sections: RuleSection[] }[] = [];
    for (const agent of agents) {
        const allSections: RuleSection[] = [];
        for (const rc of agent.rulesContent) {
            const sections = autoparse(rc.content, rc.file);
            allSections.push(...sections);
        }
        parsedByTool.push({ toolId: agent.tool.id, sections: allSections });
    }

    // Step 2: Detect conflicts
    const conflicts = detectConflicts(parsedByTool);
    if (conflicts.length > 0) {
        printConflicts(conflicts);
        saveConflicts(workspacePath, conflicts);
        console.log('  ⛔ Sync blocked. Resolve conflicts first.\n');
        return { diffs: [], conflictCount: conflicts.length };
    }

    // Step 3: Build union of all headings
    const allHeadings = new Map<string, { toolId: string; section: RuleSection }>();
    for (const { toolId, sections } of parsedByTool) {
        // Only pick from source agents
        if (options.from && toolId !== options.from) continue;
        for (const section of sections) {
            const key = section.heading.toLowerCase().trim();
            if (!allHeadings.has(key)) {
                allHeadings.set(key, { toolId, section });
            }
        }
    }

    // Step 4: Diff — find what's missing in each target tool
    const diffs: SyncDiff[] = [];
    for (const targetAgent of targetAgents) {
        // Skip if target is same as source in one-directional mode
        if (options.from && targetAgent.tool.id === options.from) continue;

        const targetParsed = parsedByTool.find(p => p.toolId === targetAgent.tool.id);
        const existingHeadings = new Set(
            targetParsed?.sections.map(s => s.heading.toLowerCase().trim()) || []
        );

        for (const [key, { toolId: sourceToolId, section }] of allHeadings) {
            if (existingHeadings.has(key)) {
                diffs.push({
                    toolId: targetAgent.tool.id,
                    file: targetAgent.tool.rulesFiles[0],
                    action: 'skip',
                    heading: section.heading,
                    content: '',
                });
            } else {
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
    const groupedByFile = new Map<string, SyncDiff[]>();
    for (const diff of additions) {
        const fullKey = `${diff.toolId}:${diff.file}`;
        if (!groupedByFile.has(fullKey)) groupedByFile.set(fullKey, []);
        groupedByFile.get(fullKey)!.push(diff);
    }

    // Group purely by file to prevent race conditions during concurrent file writing
    const groupedByRealFile = new Map<string, { toolId: string; file: string; diffs: SyncDiff[] }[]>();
    for (const [key, fileDiffs] of groupedByFile) {
        const [toolId, file] = key.split(':');
        console.log(`  → [${toolId}] ${file}`);

        for (const diff of fileDiffs) {
            console.log(`    + "${diff.heading}"`);
        }

        if (!groupedByRealFile.has(file)) groupedByRealFile.set(file, []);
        groupedByRealFile.get(file)!.push({ toolId, file, diffs: fileDiffs });
    }

    const writePromises: Promise<void>[] = [];

    if (!options.dryRun) {
        for (const [file, writes] of groupedByRealFile) {
            const fullPath = path.join(workspacePath, file);

            const writePromise = fs.promises.readFile(fullPath, 'utf8')
                .catch(err => {
                    if (err.code === 'ENOENT') return '';
                    throw err;
                })
                .then(existingContent => {
                    let appended = '';
                    for (const write of writes) {
                        appended += '\n\n# --- Synced by aigit ---\n\n';
                        for (const diff of write.diffs) {
                            appended += `## ${diff.heading}\n\n${diff.content}\n\n`;
                        }
                    }
                    return fs.promises.writeFile(fullPath, existingContent + appended, 'utf8');
                });

            writePromises.push(writePromise);
        }

        if (writePromises.length > 0) {
            await Promise.all(writePromises);
        }
    }

    for (const _ of groupedByFile) {
        console.log();
    }

    if (options.dryRun) {
        console.log('  (dry run — no files were changed)\n');
    } else {
        console.log('  ✅ Sync complete.\n');
    }

    return { diffs, conflictCount: 0 };
}
