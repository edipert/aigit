import { describe, it, expect, vi } from 'vitest';
import { detectConflicts, saveConflicts, loadConflicts } from './conflicts';
import fs from 'fs';
import path from 'path';

vi.mock('fs');

describe('detectConflicts', () => {
    it('handles empty input', () => {
        const result = detectConflicts([]);
        expect(result).toEqual([]);
    });

    it('handles single tool (no conflicts possible)', () => {
        const input = [
            {
                toolId: 'tool1',
                sections: [
                    { heading: 'Rule 1', content: 'Content 1', sourceFile: 'file1.md', sourceLine: 1 }
                ]
            }
        ];
        const result = detectConflicts(input);
        expect(result).toEqual([]);
    });

    it('handles multiple tools with identical sections (no conflicts)', () => {
        const input = [
            {
                toolId: 'tool1',
                sections: [
                    { heading: 'Rule 1', content: 'Content 1', sourceFile: 'file1.md', sourceLine: 1 }
                ]
            },
            {
                toolId: 'tool2',
                sections: [
                    { heading: 'Rule 1', content: 'Content 1', sourceFile: 'file2.md', sourceLine: 1 }
                ]
            }
        ];
        const result = detectConflicts(input);
        expect(result).toEqual([]);
    });

    it('detects conflict with same heading but different content', () => {
        const input = [
            {
                toolId: 'tool1',
                sections: [
                    { heading: 'Rule 1', content: 'Content 1', sourceFile: 'file1.md', sourceLine: 1 }
                ]
            },
            {
                toolId: 'tool2',
                sections: [
                    { heading: 'Rule 1', content: 'Different Content', sourceFile: 'file2.md', sourceLine: 1 }
                ]
            }
        ];
        const result = detectConflicts(input);
        expect(result).toHaveLength(1);
        expect(result[0].topic).toBe('rule 1');
        expect(result[0].entries).toHaveLength(2);
        expect(result[0].entries[0].toolId).toBe('tool1');
        expect(result[0].entries[1].toolId).toBe('tool2');
    });

    it('detects conflict with normalized headings', () => {
        const input = [
            {
                toolId: 'tool1',
                sections: [
                    { heading: 'Rule 1!', content: 'Content 1', sourceFile: 'file1.md', sourceLine: 1 }
                ]
            },
            {
                toolId: 'tool2',
                sections: [
                    { heading: '  RULE 1  ', content: 'Different Content', sourceFile: 'file2.md', sourceLine: 1 }
                ]
            }
        ];
        const result = detectConflicts(input);
        expect(result).toHaveLength(1);
        expect(result[0].topic).toBe('rule 1');
    });

    it('ignores differences in content whitespace/case during conflict detection', () => {
        const input = [
            {
                toolId: 'tool1',
                sections: [
                    { heading: 'Rule 1', content: 'Content 1', sourceFile: 'file1.md', sourceLine: 1 }
                ]
            },
            {
                toolId: 'tool2',
                sections: [
                    { heading: 'Rule 1', content: '  CONTENT 1  ', sourceFile: 'file2.md', sourceLine: 1 }
                ]
            }
        ];
        const result = detectConflicts(input);
        expect(result).toEqual([]);
    });

    it('handles multiple headings across multiple tools', () => {
        const input = [
            {
                toolId: 'tool1',
                sections: [
                    { heading: 'Rule 1', content: 'Content 1', sourceFile: 'file1.md', sourceLine: 1 },
                    { heading: 'Rule 2', content: 'Content 2', sourceFile: 'file1.md', sourceLine: 10 }
                ]
            },
            {
                toolId: 'tool2',
                sections: [
                    { heading: 'Rule 1', content: 'Different Content', sourceFile: 'file2.md', sourceLine: 1 },
                    { heading: 'Rule 3', content: 'Content 3', sourceFile: 'file2.md', sourceLine: 5 }
                ]
            }
        ];
        const result = detectConflicts(input);
        expect(result).toHaveLength(1);
        expect(result[0].topic).toBe('rule 1');
    });
});

describe('saveConflicts and loadConflicts', () => {
    const workspacePath = '/test/workspace';
    const conflicts = [
        {
            topic: 'rule 1',
            entries: [
                { toolId: 'tool1', file: 'file1.md', line: 1, content: 'Content 1' },
                { toolId: 'tool2', file: 'file2.md', line: 1, content: 'Different' }
            ]
        }
    ];

    it('saveConflicts writes to the correct path', () => {
        saveConflicts(workspacePath, conflicts);
        const expectedPath = path.join(workspacePath, '.aigit/conflicts.json');
        expect(fs.writeFileSync).toHaveBeenCalledWith(
            expectedPath,
            JSON.stringify(conflicts, null, 2),
            'utf8'
        );
    });

    it('loadConflicts returns parsed JSON when file exists', () => {
        const expectedPath = path.join(workspacePath, '.aigit/conflicts.json');
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(conflicts));

        const result = loadConflicts(workspacePath);
        expect(fs.readFileSync).toHaveBeenCalledWith(expectedPath, 'utf8');
        expect(result).toEqual(conflicts);
    });

    it('loadConflicts returns empty array when file does not exist', () => {
        vi.mocked(fs.existsSync).mockReturnValue(false);
        const result = loadConflicts(workspacePath);
        expect(result).toEqual([]);
    });

    it('loadConflicts returns empty array on parse error', () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockReturnValue('invalid json');
        const result = loadConflicts(workspacePath);
        expect(result).toEqual([]);
    });
});
