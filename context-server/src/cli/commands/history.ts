import { showContextLog, showContextStatus, revertContextId } from '../history';
import type { CommandHandler } from './types';

const handler: CommandHandler = async ({ args, workspacePath, command }) => {
    if (command === 'log') {
        await showContextLog(workspacePath);
    } else if (command === 'status') {
        await showContextStatus(workspacePath);
    } else if (command === 'revert') {
        const targetId = args[0];
        if (!targetId) {
            console.error('⚠️  Error: You must specify a Context ID to revert.');
            console.log('Usage: aigit revert <context-id>');
            process.exit(1);
        }
        await revertContextId(workspacePath, targetId);
    }
};

export default handler;
