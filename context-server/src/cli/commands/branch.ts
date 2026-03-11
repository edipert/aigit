import { checkContextConflicts } from '../conflict';
import { mergeContextBranches } from '../merge';
import type { CommandHandler } from './types';

const handler: CommandHandler = async ({ args, workspacePath, command }) => {
    if (command === 'check-conflicts') {
        const targetBranch = args[0] || 'main';
        await checkContextConflicts(workspacePath, targetBranch);
    } else if (command === 'merge') {
        const sourceBranch = args[0];
        if (!sourceBranch) {
            console.error('⚠️  Error: You must specify a source branch to merge from.');
            console.log('Usage: aigit merge <source-branch> [target-branch]');
            process.exit(1);
        }
        const targetBranch = args[1] || 'main';
        await mergeContextBranches(workspacePath, sourceBranch, targetBranch);
    }
};

export default handler;
