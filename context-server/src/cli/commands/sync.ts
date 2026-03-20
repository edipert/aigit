import { dumpContextLedger, loadContextLedger } from '../sync';
import { syncAgents } from '../../agents/sync';
import { loadConflicts, printConflicts } from '../../agents/conflicts';
import { withSpinner, ok, warn, fail } from '../output';
import type { CommandHandler } from './types';

const handler: CommandHandler = async ({ args, workspacePath, command }) => {
    if (command === 'dump') {
        await withSpinner('Serializing memory → .aigit/ledger.json', () => dumpContextLedger(workspacePath));
        ok('Context ledger saved.');
    } else if (command === 'load') {
        await withSpinner('Importing .aigit/ledger.json → memory DB', () => loadContextLedger(workspacePath));
        ok('Context ledger loaded.');
    } else if (command === 'sync') {
        const dryRun = args.includes('--dry-run');
        const skillsMigrate = args.includes('--skills');
        const fromIdx = args.indexOf('--from');
        const toIdx = args.indexOf('--to');
        const from = fromIdx !== -1 ? args[fromIdx + 1] : undefined;
        const to = toIdx !== -1 ? args[toIdx + 1] : undefined;

        await withSpinner(
            dryRun ? 'Syncing AI tool configs (dry run)…' : 'Syncing AI tool configs…',
            async () => { await syncAgents(workspacePath, { dryRun, from, to }); }
        );

        if (skillsMigrate && !dryRun) {
            const { migrateSkills } = await import('../../agents/migration');
            const result = await withSpinner('Migrating skills…', async () => migrateSkills(workspacePath));
            if (result.migrated.length > 0) {
                ok(`Unified ${result.migrated.length} skill folder(s) into .aigit/skills.`);
            } else {
                ok('No skill folders required migration.');
            }
            if (result.errors.length > 0) {
                result.errors.forEach((err: string) => warn(err));
            }
        }
    } else if (command === 'conflicts') {
        const conflicts = loadConflicts(workspacePath);
        printConflicts(conflicts);
    }
};

export default handler;
