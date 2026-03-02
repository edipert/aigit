"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.semanticSearch = semanticSearch;
const db_1 = require("../db");
const embeddings_1 = require("./embeddings");
/**
 * Semantic search against the live database.
 * Queries memories and decisions by relevance to the input query.
 */
async function semanticSearch(options) {
    const { query, branch, filePath, symbolName, topK = 10 } = options;
    // Build where clause
    const memoryWhere = {};
    const decisionWhere = {};
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
        db_1.prisma.memory.findMany({ where: memoryWhere, orderBy: { createdAt: 'desc' }, take: 50 }),
        db_1.prisma.decision.findMany({ where: decisionWhere, orderBy: { createdAt: 'desc' }, take: 50 }),
    ]);
    // Flatten into searchable documents
    const docs = [
        ...memories.map(m => ({
            id: m.id,
            text: `[MEMORY] ${m.type}: ${m.content}${m.symbolName ? ` @${m.symbolName}` : ''}`,
            type: 'memory',
            date: m.createdAt,
            filePath: m.filePath,
            symbolName: m.symbolName,
        })),
        ...decisions.map(d => ({
            id: d.id,
            text: `[DECISION] ${d.context} → ${d.chosen} (Reason: ${d.reasoning})${d.symbolName ? ` @${d.symbolName}` : ''}`,
            type: 'decision',
            date: d.createdAt,
            filePath: d.filePath,
            symbolName: d.symbolName,
        })),
    ];
    // Rank by similarity
    const ranked = (0, embeddings_1.rankBySimilarity)(query, docs, topK);
    // Enrich with metadata
    return ranked.map(r => {
        const original = docs.find(d => d.id === r.id);
        return {
            ...r,
            type: original.type,
            date: original.date,
            filePath: original.filePath,
            symbolName: original.symbolName,
        };
    });
}
