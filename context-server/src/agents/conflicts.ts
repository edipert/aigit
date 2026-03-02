import fs from 'fs';
import path from 'path';
import { RuleSection } from './parsers';

export interface Conflict {
    topic: string;
    entries: {
        toolId: string;
        file: string;
        line: number;
        content: string;
    }[];
}

const CONFLICTS_FILE = '.aigit/conflicts.json';

/**
 * Detect conflicting rules across parsed sections from multiple tools.
 * Uses heading similarity to find potential conflicts.
 */
export function detectConflicts(
    parsedByTool: { toolId: string; sections: RuleSection[] }[]
): Conflict[] {
    const conflicts: Conflict[] = [];
    const headingMap = new Map<string, { toolId: string; section: RuleSection }[]>();

    // Group sections by normalized heading
    for (const { toolId, sections } of parsedByTool) {
        for (const section of sections) {
            const key = normalizeHeading(section.heading);
            if (!headingMap.has(key)) {
                headingMap.set(key, []);
            }
            headingMap.get(key)!.push({ toolId, section });
        }
    }

    // Find headings that appear in multiple tools with different content
    for (const [topic, entries] of headingMap) {
        if (entries.length < 2) continue;

        const uniqueContents = new Set(entries.map(e => normalizeContent(e.section.content)));
        if (uniqueContents.size > 1) {
            conflicts.push({
                topic,
                entries: entries.map(e => ({
                    toolId: e.toolId,
                    file: e.section.sourceFile,
                    line: e.section.sourceLine,
                    content: e.section.content.slice(0, 200),
                })),
            });
        }
    }

    return conflicts;
}

/**
 * Save conflicts to the .aigit directory.
 */
export function saveConflicts(workspacePath: string, conflicts: Conflict[]): void {
    const filePath = path.join(workspacePath, CONFLICTS_FILE);
    fs.writeFileSync(filePath, JSON.stringify(conflicts, null, 2), 'utf8');
}

/**
 * Load saved conflicts from a previous sync.
 */
export function loadConflicts(workspacePath: string): Conflict[] {
    const filePath = path.join(workspacePath, CONFLICTS_FILE);
    if (!fs.existsSync(filePath)) return [];
    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch {
        return [];
    }
}

/**
 * Print conflicts to the console.
 */
export function printConflicts(conflicts: Conflict[]): void {
    if (conflicts.length === 0) {
        console.log('\n✅ No conflicts detected. All tools are in sync.\n');
        return;
    }

    console.log(`\n⚠️  ${conflicts.length} CONFLICT(S) DETECTED\n`);
    for (const c of conflicts) {
        console.log(`  Topic: "${c.topic}"`);
        for (const e of c.entries) {
            const preview = e.content.split('\n')[0].slice(0, 80);
            console.log(`    [${e.toolId}] ${e.file}:L${e.line} → "${preview}..."`);
        }
        console.log();
    }
    console.log('  Action required: Fix conflicts manually, then run `aigit sync` again.\n');
}

function normalizeHeading(h: string): string {
    return h.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
}

function normalizeContent(c: string): string {
    return c.replace(/\s+/g, ' ').trim().toLowerCase();
}
