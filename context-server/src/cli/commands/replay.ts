import { buildTimeline, formatReplayNarrative } from '../../agents/storyteller';
import type { CommandHandler } from './types';

const handler: CommandHandler = async ({ args }) => {
    const targetPath = args[0];
    if (!targetPath) {
        console.error('⚠️  Error: You must provide a file or directory path to replay.');
        console.log('Usage: aigit replay <path>');
        process.exit(1);
    }
    const timeline = await buildTimeline(targetPath);
    const narrative = formatReplayNarrative(targetPath, timeline);
    console.log(narrative);
};

export default handler;
