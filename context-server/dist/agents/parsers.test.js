"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const parsers_1 = require("./parsers");
(0, vitest_1.describe)('parseMarkdownSections', () => {
    (0, vitest_1.it)('handles empty input', () => {
        const result = (0, parsers_1.parseMarkdownSections)('', 'test.md');
        (0, vitest_1.expect)(result).toEqual([]);
    });
    (0, vitest_1.it)('handles content without headings, defaulting to "Rules"', () => {
        const content = 'This is a simple rule.\nIt has multiple lines.';
        const result = (0, parsers_1.parseMarkdownSections)(content, 'test.md');
        (0, vitest_1.expect)(result).toEqual([
            {
                heading: 'Rules',
                content: 'This is a simple rule.\nIt has multiple lines.',
                sourceFile: 'test.md',
                sourceLine: 1,
            }
        ]);
    });
    (0, vitest_1.it)('parses a single heading with content', () => {
        const content = '# Main Rule\nDo not break the build.';
        const result = (0, parsers_1.parseMarkdownSections)(content, 'test.md');
        (0, vitest_1.expect)(result).toEqual([
            {
                heading: 'Main Rule',
                content: 'Do not break the build.',
                sourceFile: 'test.md',
                sourceLine: 1,
            }
        ]);
    });
    (0, vitest_1.it)('parses multiple headings into separate sections', () => {
        const content = '# Rule 1\nContent 1\n## Rule 2\nContent 2\n### Rule 3\nContent 3';
        const result = (0, parsers_1.parseMarkdownSections)(content, 'test.md');
        (0, vitest_1.expect)(result).toEqual([
            {
                heading: 'Rule 1',
                content: 'Content 1',
                sourceFile: 'test.md',
                sourceLine: 1,
            },
            {
                heading: 'Rule 2',
                content: 'Content 2',
                sourceFile: 'test.md',
                sourceLine: 3,
            },
            {
                heading: 'Rule 3',
                content: 'Content 3',
                sourceFile: 'test.md',
                sourceLine: 5,
            }
        ]);
    });
    (0, vitest_1.it)('handles headings with leading content (default Rules section + headings)', () => {
        const content = 'Preamble rules.\n# Specific Rule\nDetail.';
        const result = (0, parsers_1.parseMarkdownSections)(content, 'test.md');
        (0, vitest_1.expect)(result).toEqual([
            {
                heading: 'Rules',
                content: 'Preamble rules.',
                sourceFile: 'test.md',
                sourceLine: 1,
            },
            {
                heading: 'Specific Rule',
                content: 'Detail.',
                sourceFile: 'test.md',
                sourceLine: 2,
            }
        ]);
    });
    (0, vitest_1.it)('ignores empty sections (heading with no content)', () => {
        const content = '# Empty Rule\n\n# Real Rule\nActual content.';
        const result = (0, parsers_1.parseMarkdownSections)(content, 'test.md');
        // Because `currentContent.join('').trim().length > 0` is required for a section to be added.
        (0, vitest_1.expect)(result).toEqual([
            {
                heading: 'Real Rule',
                content: 'Actual content.',
                sourceFile: 'test.md',
                sourceLine: 3, // line index 2 -> 3
            }
        ]);
    });
    (0, vitest_1.it)('documents current behavior: blindly matches # inside code blocks at the start of lines', () => {
        const content = 'Some text\n```bash\n# Comment in code\necho "hello"\n```';
        const result = (0, parsers_1.parseMarkdownSections)(content, 'test.md');
        // Since `^#{1,3}\s+` matches `# Comment in code`, it splits there.
        (0, vitest_1.expect)(result).toEqual([
            {
                heading: 'Rules',
                content: 'Some text\n```bash',
                sourceFile: 'test.md',
                sourceLine: 1,
            },
            {
                heading: 'Comment in code',
                content: 'echo "hello"\n```',
                sourceFile: 'test.md',
                sourceLine: 3,
            }
        ]);
    });
    (0, vitest_1.it)('documents current behavior: handles #> 3 gracefully (ignores them as headings)', () => {
        const content = '#### Rule 4\nContent for h4';
        const result = (0, parsers_1.parseMarkdownSections)(content, 'test.md');
        // The regex is `^(#{1,3})\s+(.+)`, so `####` is not a heading.
        (0, vitest_1.expect)(result).toEqual([
            {
                heading: 'Rules',
                content: '#### Rule 4\nContent for h4',
                sourceFile: 'test.md',
                sourceLine: 1,
            }
        ]);
    });
    (0, vitest_1.it)('handles extra whitespaces around heading names', () => {
        const content = '#    Spaced Rule    \nContent';
        const result = (0, parsers_1.parseMarkdownSections)(content, 'test.md');
        (0, vitest_1.expect)(result).toEqual([
            {
                heading: 'Spaced Rule', // because match[2].trim()
                content: 'Content',
                sourceFile: 'test.md',
                sourceLine: 1,
            }
        ]);
    });
});
