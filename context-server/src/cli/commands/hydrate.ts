import { compileHydratedContext } from '../hydration';
import { findWorkspaceRoot } from '../../db';
import type { CommandHandler } from './types';

const handler: CommandHandler = async ({ args }) => {
    const workspacePath = findWorkspaceRoot(process.cwd());
    const activeFile = args[0];
    const context = await compileHydratedContext(workspacePath, activeFile);
    console.log(context);
};

export default handler;
