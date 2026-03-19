import { describe, it, expect } from 'vitest';
import { parseMarkdownSections } from './parsers';

describe('parseMarkdownSections', () => {
    it('handles empty input', () => {
        const result = parseMarkdownSections('', 'test.md');
        expect(result).toEqual([]);
    });

    it('handles content without headings, defaulting to "Rules"', () => {
        const content = 'This is a simple rule.\nIt has multiple lines.';
        const result = parseMarkdownSections(content, 'test.md');
        expect(result).toEqual([
            {
                heading: 'Rules',
                content: 'This is a simple rule.\nIt has multiple lines.',
                sourceFile: 'test.md',
                sourceLine: 1,
            }
        ]);
    });

    it('parses a single heading with content', () => {
        const content = '# Main Rule\nDo not break the build.';
        const result = parseMarkdownSections(content, 'test.md');
        expect(result).toEqual([
            {
                heading: 'Main Rule',
                content: 'Do not break the build.',
                sourceFile: 'test.md',
                sourceLine: 1,
            }
        ]);
    });

    it('parses multiple headings into separate sections', () => {
        const content = '# Rule 1\nContent 1\n## Rule 2\nContent 2\n### Rule 3\nContent 3';
        const result = parseMarkdownSections(content, 'test.md');
        expect(result).toEqual([
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

    it('handles headings with leading content (default Rules section + headings)', () => {
        const content = 'Preamble rules.\n# Specific Rule\nDetail.';
        const result = parseMarkdownSections(content, 'test.md');
        expect(result).toEqual([
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

    it('ignores empty sections (heading with no content)', () => {
        const content = '# Empty Rule\n\n# Real Rule\nActual content.';
        const result = parseMarkdownSections(content, 'test.md');
        // Because `currentContent.join('').trim().length > 0` is required for a section to be added.
        expect(result).toEqual([
            {
                heading: 'Real Rule',
                content: 'Actual content.',
                sourceFile: 'test.md',
                sourceLine: 3, // line index 2 -> 3
            }
        ]);
    });

    it('documents current behavior: blindly matches # inside code blocks at the start of lines', () => {
        const content = 'Some text\n```bash\n# Comment in code\necho "hello"\n```';
        const result = parseMarkdownSections(content, 'test.md');
        // Since `^#{1,3}\s+` matches `# Comment in code`, it splits there.
        expect(result).toEqual([
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

    it('documents current behavior: handles #> 3 gracefully (ignores them as headings)', () => {
        const content = '#### Rule 4\nContent for h4';
        const result = parseMarkdownSections(content, 'test.md');
        // The regex is `^(#{1,3})\s+(.+)`, so `####` is not a heading.
        expect(result).toEqual([
            {
                heading: 'Rules',
                content: '#### Rule 4\nContent for h4',
                sourceFile: 'test.md',
                sourceLine: 1,
            }
        ]);
    });

    it('handles extra whitespaces around heading names', () => {
        const content = '#    Spaced Rule    \nContent';
        const result = parseMarkdownSections(content, 'test.md');
        expect(result).toEqual([
            {
                heading: 'Spaced Rule', // because match[2].trim()
                content: 'Content',
                sourceFile: 'test.md',
                sourceLine: 1,
            }
        ]);
    });
});
