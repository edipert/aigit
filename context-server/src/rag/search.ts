import { prisma } from '../db';
import { rankBySimilarity } from './embeddings';

/**
 * Semantic search against the live database.
 * Queries memories and decisions by relevance to the input query.
 */
export async function semanticSearch(options: {
    query: string;
    branch?: string;
    filePath?: string;
    symbolName?: string;
    topK?: number;
}) {
    const { query, branch, filePath, symbolName, topK = 10 } = options;

    // Build where clause
    const memoryWhere: Record<string, unknown> = {};
    const decisionWhere: Record<string, unknown> = {};

    if (branch) {
        memoryWhere.gitBranch = { in: ['main', branch] };
        decisionWhere.gitBranch = { in: ['main', branch] };
    }
    if (filePath) {
        memoryWhere.filePath = { contains: filePath };
        decisionWhere.filePath = { contains: filePath };
    }
    if (symbolName) {
        memoryWhere.symbolName = symbolName;
        decisionWhere.symbolName = symbolName;
    }

    const [memories, decisions] = await Promise.all([
        prisma.memory.findMany({ where: memoryWhere, orderBy: { createdAt: 'desc' }, take: 50 }),
        prisma.decision.findMany({ where: decisionWhere, orderBy: { createdAt: 'desc' }, take: 50 }),
    ]);

    // Flatten into searchable documents
    const docs = [
        ...memories.map(m => ({
            id: m.id,
            text: `[MEMORY] ${m.type}: ${m.content}${m.symbolName ? ` @${m.symbolName}` : ''}`,
            type: 'memory' as const,
            date: m.createdAt,
            filePath: m.filePath,
            symbolName: m.symbolName,
        })),
        ...decisions.map(d => ({
            id: d.id,
            text: `[DECISION] ${d.context} → ${d.chosen} (Reason: ${d.reasoning})${d.symbolName ? ` @${d.symbolName}` : ''}`,
            type: 'decision' as const,
            date: d.createdAt,
            filePath: d.filePath,
            symbolName: d.symbolName,
        })),
    ];

    // Rank by similarity
    const ranked = rankBySimilarity(query, docs, topK);

    // Enrich with metadata
    const docsMap = new Map(docs.map(d => [d.id, d]));
    return ranked.map(r => {
        const original = docsMap.get(r.id)!;
        return {
            ...r,
            type: original.type,
            date: original.date,
            filePath: original.filePath,
            symbolName: original.symbolName,
        };
    });
}
