"use strict";
/**
 * Parsers for extracting structured rule sections from different AI tool formats.
 * Each tool stores rules/memory differently — this normalizes them.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseMarkdownSections = parseMarkdownSections;
exports.parseFlatRules = parseFlatRules;
exports.parseYamlRules = parseYamlRules;
exports.autoparse = autoparse;
/**
 * Parse a Markdown file into logical sections based on headings.
 * Works for: GEMINI.md, AGENTS.md, CLAUDE.md, MEMORY.md, CODEX.md, CONVENTIONS.md, copilot-instructions.md
 */
function parseMarkdownSections(content, sourceFile) {
    const sections = [];
    const lines = content.split('\n');
    let currentHeading = 'Rules';
    let currentContent = [];
    let headingLine = 1;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const headingMatch = line.match(/^(#{1,3})\s+(.+)/);
        if (headingMatch) {
            // Save previous section
            if (currentContent.join('').trim().length > 0) {
                sections.push({
                    heading: currentHeading,
                    content: currentContent.join('\n').trim(),
                    sourceFile,
                    sourceLine: headingLine,
                });
            }
            currentHeading = headingMatch[2].trim();
            currentContent = [];
            headingLine = i + 1;
        }
        else {
            currentContent.push(line);
        }
    }
    // Save last section
    if (currentContent.join('').trim().length > 0) {
        sections.push({
            heading: currentHeading,
            content: currentContent.join('\n').trim(),
            sourceFile,
            sourceLine: headingLine,
        });
    }
    return sections;
}
/**
 * Parse a flat rules file (no headings) into a single section.
 * Works for: .cursorrules, .clinerules, .windsurfrules
 */
function parseFlatRules(content, sourceFile) {
    const trimmed = content.trim();
    if (!trimmed)
        return [];
    return [{
            heading: 'Rules',
            content: trimmed,
            sourceFile,
            sourceLine: 1,
        }];
}
/**
 * Parse YAML config (basic key extraction).
 * Works for: .aider.conf.yml
 */
function parseYamlRules(content, sourceFile) {
    const sections = [];
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Look for top-level keys (not indented)
        const keyMatch = line.match(/^([a-zA-Z_-]+):\s*(.*)$/);
        if (keyMatch) {
            const key = keyMatch[1];
            let value = keyMatch[2];
            // Collect multi-line values (indented lines following)
            let j = i + 1;
            while (j < lines.length && (lines[j].startsWith('  ') || lines[j].startsWith('\t'))) {
                value += '\n' + lines[j];
                j++;
            }
            if (value.trim()) {
                sections.push({
                    heading: key,
                    content: value.trim(),
                    sourceFile,
                    sourceLine: i + 1,
                });
            }
        }
    }
    return sections;
}
/**
 * Auto-detect format and parse accordingly.
 */
function autoparse(content, sourceFile) {
    if (sourceFile.endsWith('.yml') || sourceFile.endsWith('.yaml')) {
        return parseYamlRules(content, sourceFile);
    }
    // Treat all other files as Markdown, which gracefully handles flat files
    // by treating content before the first heading as the "Rules" preamble section.
    return parseMarkdownSections(content, sourceFile);
}
