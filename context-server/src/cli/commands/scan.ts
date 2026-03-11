import { detectAgents, printScanReport } from '../../agents/registry';
import type { CommandHandler } from './types';

const handler: CommandHandler = async ({ workspacePath }) => {
    const agents = detectAgents(workspacePath);
    printScanReport(agents);
};

export default handler;
