import { runAudit, buildDepHealPlan, formatDepReport, executeDepAutoHeal } from '../../healing/depAudit';
import type { CommandHandler } from './types';

const handler: CommandHandler = async ({ args, workspacePath }) => {
    const auto = args.includes('--auto');

    console.log('\n📦 Running dependency audit...\n');
    const audit = runAudit(workspacePath);
    const plan = await buildDepHealPlan(audit, workspacePath);

    console.log(formatDepReport(plan));

    if (auto) {
        if (audit.fixableCount === 0) {
            console.log('✅ No auto-fixable vulnerabilities found. Nothing to auto-heal.');
            return;
        }
        console.log(`\n⚙️  Auto-healing ${audit.fixableCount} vulnerabilities on branch: ${plan.branchName}...\n`);
        const result = executeDepAutoHeal(workspacePath, plan.branchName);
        console.log(result.message);
    } else if (audit.fixableCount > 0) {
        console.log('👉 Run `aigit deps --auto` to automatically branch and fix these vulnerabilities.');
    }
};

export default handler;
