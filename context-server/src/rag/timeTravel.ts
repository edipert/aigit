import { execFileSync } from 'child_process';
import { rankBySimilarity } from './embeddings';

interface LedgerEntry {
    id: string;
    type: string;
    content?: string;
    context?: string;
    chosen?: string;
    reasoning?: string;
    filePath?: string;
    symbolName?: string;
    createdAt?: string;
    gitBranch?: string;
}

interface LedgerData {
    memories?: LedgerEntry[];
    decisions?: LedgerEntry[];
    tasks?: unknown[];
}

/**
 * Retrieve the .aigit/ledger.json file as it existed at a specific commit.
 */
export function getHistoricalLedger(commitHash: string, workspacePath: string): LedgerData | null {
    try {
        const raw = execFileSync('git', ['show', `${commitHash}:.aigit/ledger.json`], {
            cwd: workspacePath,
            encoding: 'utf-8',
            stdio: ['pipe', 'pipe', 'pipe'],
        });
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

/**
 * Query the semantic memory as it existed at a specific commit hash.
 */
export function queryHistoricalContext(options: {
    query: string;
    commitHash: string;
    workspacePath: string;
    topK?: number;
}) {
    const { query, commitHash, workspacePath, topK = 5 } = options;

    const ledger = getHistoricalLedger(commitHash, workspacePath);
    if (!ledger) {
        return {
            success: false,
            error: `Could not find .aigit/ledger.json at commit ${commitHash}. Run 'aigit dump' before committing to enable time-travel queries.`,
            results: [],
        };
    }

    // Build searchable documents from historical ledger
    const docs: { id: string; text: string }[] = [];

    if (ledger.memories) {
        for (const m of ledger.memories) {
            docs.push({
                id: m.id,
                text: `[MEMORY] ${m.type}: ${m.content || ''}${m.symbolName ? ` @${m.symbolName}` : ''}`,
            });
        }
    }

    if (ledger.decisions) {
        for (const d of ledger.decisions) {
            docs.push({
                id: d.id,
                text: `[DECISION] ${d.context || ''} → ${d.chosen || ''} (${d.reasoning || ''})${d.symbolName ? ` @${d.symbolName}` : ''}`,
            });
        }
    }

    if (docs.length === 0) {
        return {
            success: true,
            commitHash,
            results: [],
            message: 'No memories or decisions found at this commit.',
        };
    }

    const ranked = rankBySimilarity(query, docs, topK);

    // Enrich with original metadata
    const allEntries = [...(ledger.memories || []), ...(ledger.decisions || [])];
    const entryMap = new Map<string, LedgerEntry>();
    for (const entry of allEntries) {
        entryMap.set(entry.id, entry);
    }

    const results = ranked.map(r => {
        const original = entryMap.get(r.id);
        return {
            ...r,
            filePath: original?.filePath || null,
            symbolName: original?.symbolName || null,
            createdAt: original?.createdAt || null,
            gitBranch: original?.gitBranch || null,
        };
    });

    return {
        success: true,
        commitHash,
        results,
    };
}
