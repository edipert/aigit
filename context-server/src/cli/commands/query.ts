import { semanticSearch } from '../../rag/search';
import { queryHistoricalContext } from '../../rag/timeTravel';
import type { CommandHandler } from './types';

const handler: CommandHandler = async ({ args }) => {
    const queryText = args[0];
    if (!queryText) {
        console.error('⚠️  Error: You must provide a query.');
        console.log('Usage: aigit query "<question>" [--commit <hash>] [--top <n>]');
        process.exit(1);
    }

    const commitIdx = args.indexOf('--commit');
    const topIdx = args.indexOf('--top');
    const commitHash = commitIdx !== -1 ? args[commitIdx + 1] : undefined;
    const topK = topIdx !== -1 ? Number(args[topIdx + 1]) : 5;

    if (commitHash) {
        const result = queryHistoricalContext({ query: queryText, commitHash, workspacePath: process.cwd(), topK });
        if (!result.success) {
            console.error(`\n❌ ${result.error}\n`);
            process.exit(1);
        }
        console.log(`\n🕰️  Time-Travel Query @ ${commitHash}:\n`);
        if (result.results.length === 0) {
            console.log('No matching context found at this commit.');
        } else {
            result.results.forEach((r: any, i: number) => {
                console.log(`  ${i + 1}. (score: ${r.score.toFixed(2)}) ${r.text}`);
                if (r.filePath) console.log(`     📁 ${r.filePath}${r.symbolName ? ` ⚓ @${r.symbolName}` : ''}`);
            });
        }
        console.log();
    } else {
        const results = await semanticSearch({ query: queryText, topK });
        console.log(`\n🔍 Semantic Search Results:\n`);
        if (results.length === 0) {
            console.log('No matching context found.');
        } else {
            results.forEach((r: any, i: number) => {
                console.log(`  ${i + 1}. [${r.type.toUpperCase()}] (score: ${r.score.toFixed(2)}) ${r.text}`);
                if (r.filePath) console.log(`     📁 ${r.filePath}${r.symbolName ? ` ⚓ @${r.symbolName}` : ''}`);
            });
        }
        console.log();
    }
};

export default handler;
