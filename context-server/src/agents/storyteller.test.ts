import { describe, it, expect } from 'vitest';
import { formatReplayNarrative, TimelineEntry } from './storyteller';

describe('formatReplayNarrative', () => {
    it('should return a specific message for an empty timeline', () => {
        const targetPath = 'src/test.ts';
        const timeline: TimelineEntry[] = [];

        const result = formatReplayNarrative(targetPath, timeline);

        expect(result).toBe(`\n📖 [aigit replay] No semantic context found for: ${targetPath}\n   Try running \`aigit note\` or committing code to build context.\n`);
    });

    it('should format a single memory entry correctly', () => {
        const targetPath = 'src/app.ts';
        const timeline: TimelineEntry[] = [
            {
                date: new Date('2024-01-01T10:00:00.000Z'),
                type: 'memory',
                content: '[MEMORY] Initial implementation',
                filePath: targetPath,
                symbolName: null,
            }
        ];

        const result = formatReplayNarrative(targetPath, timeline);

        expect(result).toContain(`📖 [aigit replay] Evolution of: ${targetPath}`);
        expect(result).toContain(`1 context entries found.`);
        expect(result).toContain(`📝 [2024-01-01 10:00] [MEMORY] Initial implementation\n`);
        expect(result).toContain(`Timeline spans: 2024-01-01 → 2024-01-01`);
    });

    it('should format a single decision entry with a symbolName correctly', () => {
        const targetPath = 'src/utils.ts';
        const timeline: TimelineEntry[] = [
            {
                date: new Date('2024-01-02T15:30:00.000Z'),
                type: 'decision',
                content: 'Context: Needed a helper → Chosen: mapHelper (Reason: faster)',
                filePath: targetPath,
                symbolName: 'mapHelper',
            }
        ];

        const result = formatReplayNarrative(targetPath, timeline);

        expect(result).toContain(`📖 [aigit replay] Evolution of: ${targetPath}`);
        expect(result).toContain(`1 context entries found.`);
        expect(result).toContain(`🔀 [2024-01-02 15:30] Context: Needed a helper → Chosen: mapHelper (Reason: faster) ⚓ @mapHelper\n`);
        expect(result).toContain(`Timeline spans: 2024-01-02 → 2024-01-02`);
    });

    it('should format multiple entries in chronological order', () => {
        const targetPath = 'src/complex.ts';
        const timeline: TimelineEntry[] = [
            {
                date: new Date('2024-01-01T09:00:00.000Z'),
                type: 'memory',
                content: '[MEMORY] Created file',
                filePath: targetPath,
                symbolName: null,
            },
            {
                date: new Date('2024-01-03T11:20:00.000Z'),
                type: 'decision',
                content: 'Context: Optimize → Chosen: O(1) approach',
                filePath: targetPath,
                symbolName: 'optimizeMe',
            },
            {
                date: new Date('2024-01-05T16:45:00.000Z'),
                type: 'memory',
                content: '[MEMORY] Refactored logic',
                filePath: targetPath,
                symbolName: 'refactored',
            }
        ];

        const result = formatReplayNarrative(targetPath, timeline);

        expect(result).toContain(`3 context entries found.`);
        expect(result).toContain(`📝 [2024-01-01 09:00] [MEMORY] Created file\n`);
        expect(result).toContain(`🔀 [2024-01-03 11:20] Context: Optimize → Chosen: O(1) approach ⚓ @optimizeMe\n`);
        expect(result).toContain(`📝 [2024-01-05 16:45] [MEMORY] Refactored logic ⚓ @refactored\n`);
        expect(result).toContain(`Timeline spans: 2024-01-01 → 2024-01-05`);

        // Ensure chronological order in string output
        const memory1Index = result.indexOf('📝 [2024-01-01 09:00]');
        const decisionIndex = result.indexOf('🔀 [2024-01-03 11:20]');
        const memory2Index = result.indexOf('📝 [2024-01-05 16:45]');

        expect(memory1Index).toBeLessThan(decisionIndex);
        expect(decisionIndex).toBeLessThan(memory2Index);
    });
});
