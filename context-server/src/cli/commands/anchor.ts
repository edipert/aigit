import * as path from 'path';
import { anchorFileToSymbols } from '../../ast/resolver';
import type { CommandHandler } from './types';

const handler: CommandHandler = async ({ args, workspacePath }) => {
    const targetFile = args[0];
    if (!targetFile) {
        console.error('⚠️  Error: You must specify a file to anchor symbols to.');
        console.log('Usage: aigit anchor <file>');
        process.exit(1);
    }

    const fullPath = path.isAbsolute(targetFile)
        ? targetFile
        : path.join(workspacePath, targetFile);

    const result = await anchorFileToSymbols(fullPath, workspacePath);
    console.log(`\n⚓ [aigit anchor] Scanned: ${targetFile}`);
    console.log(`   Anchored ${result.anchored}/${result.total} unlinked entries to code symbols.\n`);
};

export default handler;
