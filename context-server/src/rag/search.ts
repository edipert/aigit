import { Prisma } from '@prisma/client';
import { prisma } from '../db';
import { embedText } from './embeddings';

/**
 * Semantic search against the live database using real pgvector embeddings.
 * Queries memories and decisions by cosine similarity to the input query.
 */
export async function semanticSearch(options: {
    query: string;
    branch?: string;
    filePath?: string;
    symbolName?: string;
    topK?: number;
}) {
    const { query, branch, filePath, symbolName, topK = 10 } = options;
    const queryEmbedding = await embedText(query);
    const vectorString = `[${queryEmbedding.join(',')}]`;

    // Construct the WHERE clause dynamically for Memories
    const memoryConditions: Prisma.Sql[] = [];
    if (branch) {
        memoryConditions.push(Prisma.sql`"gitBranch" IN ('main', ${branch})`);
    }
    if (filePath) {
        memoryConditions.push(Prisma.sql`"filePath" LIKE ${'%' + filePath + '%'}`);
    }
    if (symbolName) {
        memoryConditions.push(Prisma.sql`"symbolName" = ${symbolName}`);
    }
    
    const memoryWhere = memoryConditions.length > 0 
        ? Prisma.sql`WHERE ${Prisma.join(memoryConditions, ' AND ')} AND "embedding" IS NOT NULL`
        : Prisma.sql`WHERE "embedding" IS NOT NULL`;

    const memoryQuery = Prisma.sql`
        SELECT id, type, content as text, "createdAt" as date, "filePath", "symbolName",
        1 - ("embedding" <=> ${vectorString}::vector) as score
        FROM "Memory"
        ${memoryWhere}
        ORDER BY "embedding" <=> ${vectorString}::vector
        LIMIT ${topK}
    `;

    // Construct the WHERE clause dynamically for Decisions
    const decisionConditions: Prisma.Sql[] = [];
    if (branch) {
        decisionConditions.push(Prisma.sql`"gitBranch" IN ('main', ${branch})`);
    }
    if (filePath) {
        decisionConditions.push(Prisma.sql`"filePath" LIKE ${'%' + filePath + '%'}`);
    }
    if (symbolName) {
        decisionConditions.push(Prisma.sql`"symbolName" = ${symbolName}`);
    }

    const decisionWhere = decisionConditions.length > 0 
        ? Prisma.sql`WHERE ${Prisma.join(decisionConditions, ' AND ')} AND "embedding" IS NOT NULL`
        : Prisma.sql`WHERE "embedding" IS NOT NULL`;

    const decisionQuery = Prisma.sql`
        SELECT id, 'decision' as type, 
        ('[DECISION] ' || "context" || ' -> ' || "chosen" || ' (Reason: ' || "reasoning" || ')') as text, 
        "createdAt" as date, "filePath", "symbolName",
        1 - ("embedding" <=> ${vectorString}::vector) as score
        FROM "Decision"
        ${decisionWhere}
        ORDER BY "embedding" <=> ${vectorString}::vector
        LIMIT ${topK}
    `;

    const [memories, decisions] = await Promise.all([
        prisma.$queryRaw<any[]>(memoryQuery),
        prisma.$queryRaw<any[]>(decisionQuery)
    ]);

    // Merge, sort by score, and take topK
    const docs = [...memories, ...decisions].sort((a, b) => b.score - a.score).slice(0, topK);
    return docs;
}
