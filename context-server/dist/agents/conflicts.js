"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectConflicts = detectConflicts;
exports.saveConflicts = saveConflicts;
exports.loadConflicts = loadConflicts;
exports.printConflicts = printConflicts;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const CONFLICTS_FILE = '.aigit/conflicts.json';
/**
 * Detect conflicting rules across parsed sections from multiple tools.
 * Uses heading similarity to find potential conflicts.
 */
function detectConflicts(parsedByTool) {
    const conflicts = [];
    const headingMap = new Map();
    // Group sections by normalized heading
    for (const { toolId, sections } of parsedByTool) {
        for (const section of sections) {
            const key = normalizeHeading(section.heading);
            if (!headingMap.has(key)) {
                headingMap.set(key, []);
            }
            headingMap.get(key).push({ toolId, section });
        }
    }
    // Find headings that appear in multiple tools with different content
    for (const [topic, entries] of headingMap) {
        if (entries.length < 2)
            continue;
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
function saveConflicts(workspacePath, conflicts) {
    const filePath = path_1.default.join(workspacePath, CONFLICTS_FILE);
    fs_1.default.writeFileSync(filePath, JSON.stringify(conflicts, null, 2), 'utf8');
}
/**
 * Load saved conflicts from a previous sync.
 */
function loadConflicts(workspacePath) {
    const filePath = path_1.default.join(workspacePath, CONFLICTS_FILE);
    if (!fs_1.default.existsSync(filePath))
        return [];
    try {
        return JSON.parse(fs_1.default.readFileSync(filePath, 'utf8'));
    }
    catch {
        return [];
    }
}
/**
 * Print conflicts to the console.
 */
function printConflicts(conflicts) {
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
function normalizeHeading(h) {
    return h.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
}
function normalizeContent(c) {
    return c.replace(/\s+/g, ' ').trim().toLowerCase();
}
