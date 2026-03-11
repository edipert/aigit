import { healFromTestFailure, getHealingHistory, retryHealingEvent } from '../../healing/runner';
import { withSpinner, ok, fail, info } from '../output';
import type { CommandHandler } from './types';

const handler: CommandHandler = async ({ args, workspacePath }) => {
    const subCommand = args[0];

    if (subCommand === 'status') {
        const history = await getHealingHistory();
        console.log(history);
        return;
    }

    if (subCommand === 'retry') {
        const eventId = args[1];
        if (!eventId) {
            fail('Please provide a healing event ID to retry.');
            process.exit(1);
        }
        const auto = args.includes('--auto');
        const result = await withSpinner(`Retrying healing event ${eventId}…`, () =>
            retryHealingEvent(eventId, workspacePath, { auto })
        );
        console.log(result.report);
        return;
    }

    const auto = args.includes('--auto');
    const cmdIdx = args.indexOf('--cmd');
    const cmd = cmdIdx !== -1 && args[cmdIdx + 1] ? args[cmdIdx + 1] : undefined;

    const result = await withSpinner('Running tests and diagnosing failures…', () =>
        healFromTestFailure(workspacePath, { auto, cmd, quiet: true })
    );

    console.log(result.report);

    if (!result.success && !auto) {
        info('Run `aigit heal --auto` to automatically commit fixes to semantic memory.');
        process.exit(1);
    }
};

export default handler;
