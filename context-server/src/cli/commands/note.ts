import { getActiveBranch } from '../git';
import { prisma } from '../../db';
import { getOrCreateDefaultProject, afterWrite } from './utils';
import type { CommandHandler } from './types';

const handler: CommandHandler = async ({ args, workspacePath }) => {
    const message = args[0];
    if (!message) {
        console.error('⚠️  Error: You must provide a note message.');
        console.log('Usage: aigit note "<message>" [--scope <path>] [--decision] [--issue <ref>]');
        process.exit(1);
    }

    const branch = getActiveBranch(workspacePath);
    const project = await getOrCreateDefaultProject(workspacePath);

    const scopeIdx = args.indexOf('--scope');
    const issueIdx = args.indexOf('--issue');
    const isDecision = args.includes('--decision');
    const filePath = scopeIdx !== -1 ? args[scopeIdx + 1] : null;
    const issueRef = issueIdx !== -1 ? args[issueIdx + 1] : null;

    const memory = await prisma.memory.create({
        data: {
            projectId: project.id,
            gitBranch: branch,
            type: isDecision ? 'architecture' : 'human_note',
            content: message,
            filePath,
            issueRef,
        },
    });

    await afterWrite(workspacePath);

    console.log(`\n📝 [aigit note] Context captured on branch [${branch}]`);
    if (filePath) console.log(`   Scope: 📁 ${filePath}`);
    if (isDecision) console.log(`   Tag: Architecture Decision`);
    if (issueRef) console.log(`   🔗 Issue: ${issueRef}`);
    console.log(`   ID: ${memory.id}\n`);
};

export default handler;
