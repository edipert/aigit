import { describe, it, expect, vi, beforeEach } from 'vitest';
import ciReportHandler from './ci';
import { prisma } from '../../db';
import * as driftModule from '../../diagnostics/drift';
import * as searchModule from '../../rag/search';

const mockSemanticSearch = vi.spyOn(searchModule, 'semanticSearch');
const mockDetectDrift = vi.spyOn(driftModule, 'detectContextDrift');

const mockFindManyMemories = vi.fn();
const mockFindManyDecisions = vi.fn();

vi.mock('../../db', () => ({
    prisma: {
        memory: { findMany: (...args: any[]) => mockFindManyMemories(...args) },
        decision: { findMany: (...args: any[]) => mockFindManyDecisions(...args) }
    }
}));

describe('aigit ci-report', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockSemanticSearch.mockResolvedValue([]);
        mockDetectDrift.mockResolvedValue({ staleCount: 0, staleItems: [] });
        mockFindManyMemories.mockResolvedValue([]);
        mockFindManyDecisions.mockResolvedValue([]);
    });

    it('should output basic markdown cleanly with no drift', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await ciReportHandler({ args: [], workspacePath: '/mock/path', command: 'ci-report' });
        
        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('No context drift detected'));
        consoleSpy.mockRestore();
    });

    it('should execute semantic search if --pr-title is provided', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        mockSemanticSearch.mockResolvedValue([{
            id: '1', text: 'Test match', type: 'memory', date: new Date(), score: 0.99, filePath: null, symbolName: null
        }]);

        await ciReportHandler({ 
            args: ['--pr-title', 'Add login feature'], 
            workspacePath: '/mock/path', 
            command: 'ci-report' 
        });
        
        expect(mockSemanticSearch).toHaveBeenCalledWith({
            query: 'Add login feature',
            topK: 5
        });
        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Test match'));
        consoleSpy.mockRestore();
    });
});
