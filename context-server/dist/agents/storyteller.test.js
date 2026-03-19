"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const storyteller_1 = require("./storyteller");
(0, vitest_1.describe)('formatReplayNarrative', () => {
    (0, vitest_1.it)('should return a specific message for an empty timeline', () => {
        const targetPath = 'src/test.ts';
        const timeline = [];
        const result = (0, storyteller_1.formatReplayNarrative)(targetPath, timeline);
        (0, vitest_1.expect)(result).toBe(`\n📖 [aigit replay] No semantic context found for: ${targetPath}\n   Try running \`aigit note\` or committing code to build context.\n`);
    });
    (0, vitest_1.it)('should format a single memory entry correctly', () => {
        const targetPath = 'src/app.ts';
        const timeline = [
            {
                date: new Date('2024-01-01T10:00:00.000Z'),
                type: 'memory',
                content: '[MEMORY] Initial implementation',
                filePath: targetPath,
                symbolName: null,
            }
        ];
        const result = (0, storyteller_1.formatReplayNarrative)(targetPath, timeline);
        (0, vitest_1.expect)(result).toContain(`📖 [aigit replay] Evolution of: ${targetPath}`);
        (0, vitest_1.expect)(result).toContain(`1 context entries found.`);
        (0, vitest_1.expect)(result).toContain(`📝 [2024-01-01 10:00] [MEMORY] Initial implementation\n`);
        (0, vitest_1.expect)(result).toContain(`Timeline spans: 2024-01-01 → 2024-01-01`);
    });
    (0, vitest_1.it)('should format a single decision entry with a symbolName correctly', () => {
        const targetPath = 'src/utils.ts';
        const timeline = [
            {
                date: new Date('2024-01-02T15:30:00.000Z'),
                type: 'decision',
                content: 'Context: Needed a helper → Chosen: mapHelper (Reason: faster)',
                filePath: targetPath,
                symbolName: 'mapHelper',
            }
        ];
        const result = (0, storyteller_1.formatReplayNarrative)(targetPath, timeline);
        (0, vitest_1.expect)(result).toContain(`📖 [aigit replay] Evolution of: ${targetPath}`);
        (0, vitest_1.expect)(result).toContain(`1 context entries found.`);
        (0, vitest_1.expect)(result).toContain(`🔀 [2024-01-02 15:30] Context: Needed a helper → Chosen: mapHelper (Reason: faster) ⚓ @mapHelper\n`);
        (0, vitest_1.expect)(result).toContain(`Timeline spans: 2024-01-02 → 2024-01-02`);
    });
    (0, vitest_1.it)('should format multiple entries in chronological order', () => {
        const targetPath = 'src/complex.ts';
        const timeline = [
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
        const result = (0, storyteller_1.formatReplayNarrative)(targetPath, timeline);
        (0, vitest_1.expect)(result).toContain(`3 context entries found.`);
        (0, vitest_1.expect)(result).toContain(`📝 [2024-01-01 09:00] [MEMORY] Created file\n`);
        (0, vitest_1.expect)(result).toContain(`🔀 [2024-01-03 11:20] Context: Optimize → Chosen: O(1) approach ⚓ @optimizeMe\n`);
        (0, vitest_1.expect)(result).toContain(`📝 [2024-01-05 16:45] [MEMORY] Refactored logic ⚓ @refactored\n`);
        (0, vitest_1.expect)(result).toContain(`Timeline spans: 2024-01-01 → 2024-01-05`);
        // Ensure chronological order in string output
        const memory1Index = result.indexOf('📝 [2024-01-01 09:00]');
        const decisionIndex = result.indexOf('🔀 [2024-01-03 11:20]');
        const memory2Index = result.indexOf('📝 [2024-01-05 16:45]');
        (0, vitest_1.expect)(memory1Index).toBeLessThan(decisionIndex);
        (0, vitest_1.expect)(decisionIndex).toBeLessThan(memory2Index);
    });
});
