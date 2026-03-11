import { exportDocs } from '../docs';
import type { CommandHandler } from './types';

const handler: CommandHandler = async ({ args }) => {
    const outIdx = args.indexOf('--out');
    const out = outIdx !== -1 ? args[outIdx + 1] : undefined;
    await exportDocs({ out });
};

export default handler;
