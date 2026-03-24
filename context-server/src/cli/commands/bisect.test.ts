import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getCommitRange, bisectCommits } from './bisect';
import child_process from 'child_process';
import fs from 'fs';

vi.mock('child_process');
vi.mock('fs');
vi.mock('../../rag/embeddings', () => ({
    similarity: vi.fn().mockReturnValue(0.9),
    embedStr: vi.fn(),
    buildVocab: vi.fn(),
    rankBySimilarity: vi.fn().mockReturnValue([{ text: 'This is the exact memory', score: 0.9, type: 'memory' }]),
}));

describe('Semantic Bisect Command', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('getCommitRange', () => {
        it('returns correctly parsed commits', () => {
            const mockOutput = 'hash1|2023-10-01|feat: 1\nhash2|2023-10-02|fix: 2\n';
            vi.mocked(child_process.execFileSync).mockReturnValue(mockOutput as any);

            const commits = getCommitRange('/test', 'start', 'HEAD');
            
            expect(commits).toHaveLength(2);
            expect(commits[0]).toEqual({ hash: 'hash1', message: 'feat: 1', date: '2023-10-01' });
            expect(commits[1]).toEqual({ hash: 'hash2', message: 'fix: 2', date: '2023-10-02' });
        });
    });

    describe('bisectCommits', () => {
        it('binary searches the timeline and finds the first occurrence', () => {
            const commits = [
                { hash: 'c1', message: 'm1', date: 'd1' },
                { hash: 'c2', message: 'm2', date: 'd2' },
                { hash: 'c3', message: 'm3', date: 'd3' },
            ];

            const mockLedger = {
                memories: [{ content: 'This is the exact memory' }],
                decisions: []
            };

            vi.mocked(child_process.execFileSync).mockImplementation((cmd: any, args: any) => {
                const combined = [cmd, ...(args || [])].join(' ');
                if (combined.includes('c2:.aigit') || combined.includes('c3:.aigit')) {
                    return Buffer.from(JSON.stringify(mockLedger)) as any;
                }
                throw new Error('Not found');
            });

            // The similarity threshold is 0.3, our mock returns 0.9.
            // So c2 and c3 will have a match, c1 will fail. Bisection should find c2.
            
            const result = bisectCommits('exact memory', commits, '/test');
            
            expect(child_process.execFileSync).toHaveBeenCalledWith('git', ['show', 'c2:.aigit/ledger.json'], expect.anything());
            expect(result.found).toBe(true);
            expect(result.commit?.hash).toBe('c2');
        });
    });
});
