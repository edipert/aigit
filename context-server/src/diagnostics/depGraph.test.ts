import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildDependencyGraph } from './depGraph';
import { prisma } from '../db';
import fs from 'fs';

vi.mock('../db', () => ({
    prisma: {
        memory: { findMany: vi.fn() },
        decision: { findMany: vi.fn() }
    }
}));

vi.mock('fs');
vi.mock('glob', () => ({
    globSync: vi.fn(() => ['src/a.ts', 'src/b.ts'])
}));

describe('Dependency Graph Builder', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('generates a mermaid graph combining AST and semantics', async () => {
        // Mock DB records
        vi.mocked(prisma.memory.findMany).mockResolvedValue([
            { id: 'm1', filePath: 'src/a.ts', content: 'memory on a', type: 'architecture' }
        ] as any);
        vi.mocked(prisma.decision.findMany).mockResolvedValue([
            { id: 'd1', filePath: 'src/b.ts', context: 'ctx', chosen: 'chosen', reasoning: 'rsn' }
        ] as any);

        // Mock FS
        vi.mocked(fs.readdirSync).mockImplementation((d: any) => {
            if (d === '/test') {
                return [
                    { name: 'src', isDirectory: () => true },
                    { name: 'package.json', isDirectory: () => false }
                ] as any;
            }
            if (d === '/test/src') {
                return [
                    { name: 'a.ts', isDirectory: () => false },
                    { name: 'b.ts', isDirectory: () => false }
                ] as any;
            }
            return [];
        });

        vi.mocked(fs.existsSync).mockImplementation((c: any) => {
            return c.endsWith('.ts');
        });
        
        vi.mocked(fs.readFileSync).mockImplementation((p: any) => {
            if (p.endsWith('a.ts')) return 'import { foo } from "./b";';
            if (p.endsWith('b.ts')) return 'export const foo = 1;';
            return '';
        });

        const result = await buildDependencyGraph('/test');
        
        expect(result.totalFiles).toBe(2);
        expect(result.totalLinks).toBeGreaterThan(0);
        
        // Assert mermaid contents
        expect(result.mermaid).toContain('flowchart LR');
        expect(result.mermaid).toContain('F0["a.ts (1M/0D)"]');
        expect(result.mermaid).toContain('F1["b.ts (0M/1D)"]');
        expect(result.mermaid).toContain('F0 --> F1');
    });
});
