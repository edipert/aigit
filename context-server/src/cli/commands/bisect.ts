import { execFileSync } from 'child_process';
import { queryHistoricalContext } from '../../rag/timeTravel';
import type { CommandHandler } from './types';

interface CommitEntry {
    hash: string;
    date: string;
    message: string;
}

/**
 * Get a list of commits in the given range, oldest first.
 */
function getCommitRange(workspacePath: string, from?: string, to?: string): CommitEntry[] {
    const range = from && to ? [`${from}..${to}`] : [];
    const args = ['log', ...range, '--reverse', '--format=%H|%ai|%s'];

    try {
        const raw = execFileSync('git', args, { cwd: workspacePath, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
        return raw
            .trim()
            .split('\n')
            .filter(Boolean)
            .map(line => {
                const [hash, date, ...msgParts] = line.split('|');
                return { hash, date, message: msgParts.join('|') };
            });
    } catch {
        return [];
    }
}

/**
 * Check if a query has matches at a given commit.
 */
function hasMatchAtCommit(query: string, commitHash: string, workspacePath: string): boolean {
    const result = queryHistoricalContext({ query, commitHash, workspacePath, topK: 1 });
    return result.success && result.results.length > 0 && result.results[0].score > 0.3;
}

/**
 * Binary search through commits to find when a decision/memory first appeared.
 */
function bisectCommits(query: string, commits: CommitEntry[], workspacePath: string): {
    found: boolean;
    commit?: CommitEntry;
    index?: number;
    context?: ReturnType<typeof queryHistoricalContext>;
} {
    if (commits.length === 0) return { found: false };

    let low = 0;
    let high = commits.length - 1;
    let firstMatch = -1;

    while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        const matches = hasMatchAtCommit(query, commits[mid].hash, workspacePath);

        if (matches) {
            firstMatch = mid;
            high = mid - 1;
        } else {
            low = mid + 1;
        }
    }

    if (firstMatch === -1) return { found: false };

    const context = queryHistoricalContext({
        query,
        commitHash: commits[firstMatch].hash,
        workspacePath,
        topK: 3,
    });

    return {
        found: true,
        commit: commits[firstMatch],
        index: firstMatch,
        context,
    };
}

const handler: CommandHandler = async ({ args, workspacePath }) => {
    const queryText = args[0];
    if (!queryText) {
        console.error('⚠️  Error: You must provide a search query.');
        console.log('Usage: aigit bisect "<query>" [--from <hash>] [--to <hash>]');
        process.exit(1);
    }

    const fromIdx = args.indexOf('--from');
    const toIdx = args.indexOf('--to');
    const fromHash = fromIdx !== -1 ? args[fromIdx + 1] : undefined;
    const toHash = toIdx !== -1 ? args[toIdx + 1] : 'HEAD';

    console.log(`\n🔬 Semantic Bisect: Searching for "${queryText}"...\n`);

    const commits = getCommitRange(workspacePath, fromHash, toHash);
    if (commits.length === 0) {
        console.error('❌ No commits found in the specified range.');
        process.exit(1);
    }

    console.log(`   📊 Scanning ${commits.length} commits (binary search)...`);
    const result = bisectCommits(queryText, commits, workspacePath);

    if (!result.found || !result.commit) {
        console.log('\n   ❌ No matching decision or memory found in the commit history.\n');
        return;
    }

    console.log(`\n   ✅ First appearance found!\n`);
    console.log(`   📍 Commit: ${result.commit.hash.substring(0, 8)}`);
    console.log(`   📅 Date:   ${result.commit.date}`);
    console.log(`   💬 Message: ${result.commit.message}`);
    console.log(`   📈 Position: Commit ${result.index! + 1} of ${commits.length}\n`);

    if (result.context?.results.length) {
        console.log('   🔍 Matching context at this commit:\n');
        result.context.results.forEach((r: any, i: number) => {
            console.log(`      ${i + 1}. (score: ${r.score.toFixed(2)}) ${r.text}`);
            if (r.filePath) console.log(`         📁 ${r.filePath}${r.symbolName ? ` ⚓ @${r.symbolName}` : ''}`);
        });
        console.log();
    }
};

export default handler;
export { getCommitRange, bisectCommits };
