"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHistoricalLedger = getHistoricalLedger;
exports.queryHistoricalContext = queryHistoricalContext;
const child_process_1 = require("child_process");
const embeddings_1 = require("./embeddings");
/**
 * Retrieve the .aigit/ledger.json file as it existed at a specific commit.
 */
function getHistoricalLedger(commitHash, workspacePath) {
    try {
        const raw = (0, child_process_1.execSync)(`git show ${commitHash}:.aigit/ledger.json`, {
            cwd: workspacePath,
            encoding: 'utf-8',
            stdio: ['pipe', 'pipe', 'pipe'],
        });
        return JSON.parse(raw);
    }
    catch {
        return null;
    }
}
/**
 * Query the semantic memory as it existed at a specific commit hash.
 */
function queryHistoricalContext(options) {
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
    const docs = [];
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
    const ranked = (0, embeddings_1.rankBySimilarity)(query, docs, topK);
    // Enrich with original metadata
    const allEntries = [...(ledger.memories || []), ...(ledger.decisions || [])];
    const results = ranked.map(r => {
        const original = allEntries.find(e => e.id === r.id);
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
