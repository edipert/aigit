function runBenchmark() {
    console.log('--- Starting Search Metadata Enrichment Benchmark ---');
    const docCount = 10000;
    const rankedCount = 1000; // typical topK max or more

    console.log(`Generating ${docCount} documents and ${rankedCount} ranked results...`);

    const docs = Array.from({ length: docCount }).map((_, i) => ({
        id: `doc-${i}`,
        type: i % 2 === 0 ? 'memory' as const : 'decision' as const,
        date: new Date(),
        filePath: `path/to/file-${i}.ts`,
        symbolName: `symbol-${i}`,
    }));

    // Randomly select `rankedCount` items from `docs` to simulate `ranked` results
    const ranked = [];
    for (let i = 0; i < rankedCount; i++) {
        const rIndex = Math.floor(Math.random() * docCount);
        ranked.push({
            id: docs[rIndex].id,
            score: Math.random(),
        });
    }

    // Baseline O(N*M)
    const startBaseline = performance.now();
    const resultBaseline = ranked.map(r => {
        const original = docs.find(d => d.id === r.id)!;
        return {
            ...r,
            type: original.type,
            date: original.date,
            filePath: original.filePath,
            symbolName: original.symbolName,
        };
    });
    const endBaseline = performance.now();
    console.log(`Baseline Execution Time: ${(endBaseline - startBaseline).toFixed(2)} ms`);

    // Optimized O(N+M)
    const startOptimized = performance.now();
    const docsMap = new Map(docs.map(d => [d.id, d]));
    const resultOptimized = ranked.map(r => {
        const original = docsMap.get(r.id)!;
        return {
            ...r,
            type: original.type,
            date: original.date,
            filePath: original.filePath,
            symbolName: original.symbolName,
        };
    });
    const endOptimized = performance.now();
    console.log(`Optimized Execution Time: ${(endOptimized - startOptimized).toFixed(2)} ms`);

    // Verify correctness
    let correct = true;
    for (let i = 0; i < rankedCount; i++) {
        if (resultBaseline[i].id !== resultOptimized[i].id ||
            resultBaseline[i].type !== resultOptimized[i].type) {
            correct = false;
            break;
        }
    }
    console.log(`Results Match: ${correct}`);
    console.log('---------------------------------------------------');
}

runBenchmark();
