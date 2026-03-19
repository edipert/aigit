import { queryHistoricalContext } from '../src/rag/timeTravel';
import * as embeddings from '../src/rag/embeddings';
import * as timeTravel from '../src/rag/timeTravel';

// Generate fake ledger data
const numEntries = 20000;
const memories = Array.from({ length: numEntries }).map((_, i) => ({
    id: `mem-${i}`,
    type: 'test-memory',
    content: `memory content ${i}`,
    filePath: `file${i}.ts`,
}));

const decisions = Array.from({ length: numEntries }).map((_, i) => ({
    id: `dec-${i}`,
    type: 'test-decision',
    context: `decision context ${i}`,
    chosen: `chosen ${i}`,
    filePath: `file${i}.ts`,
}));

// Mock `getHistoricalLedger` to return our fake data
// @ts-ignore
timeTravel.getHistoricalLedger = () => ({
    memories,
    decisions,
});

// Mock `rankBySimilarity` to just return the top K documents, ignoring the actual embeddings part to isolate the dictionary lookup logic
// @ts-ignore
embeddings.rankBySimilarity = (query: string, docs: any[], topK: number) => {
    return docs.slice(0, topK).map((doc: any, idx: number) => ({ ...doc, score: 1 - idx * 0.1 }));
};

const topK = 5000; // Increase topK to really stress the mapping logic

console.log('Running benchmark...');
const startTime = performance.now();

for (let i = 0; i < 100; i++) {
    queryHistoricalContext({
        query: 'test query',
        commitHash: 'fake-commit',
        workspacePath: 'fake-workspace',
        topK,
    });
}

const endTime = performance.now();
const duration = endTime - startTime;

console.log(`Benchmark completed in ${duration.toFixed(2)} ms`);
