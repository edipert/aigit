"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const depAudit_1 = require("../../healing/depAudit");
const handler = async ({ args, workspacePath }) => {
    const auto = args.includes('--auto');
    console.log('\n📦 Running dependency audit...\n');
    const audit = (0, depAudit_1.runAudit)(workspacePath);
    const plan = await (0, depAudit_1.buildDepHealPlan)(audit, workspacePath);
    console.log((0, depAudit_1.formatDepReport)(plan));
    if (auto) {
        if (audit.fixableCount === 0) {
            console.log('✅ No auto-fixable vulnerabilities found. Nothing to auto-heal.');
            return;
        }
        console.log(`\n⚙️  Auto-healing ${audit.fixableCount} vulnerabilities on branch: ${plan.branchName}...\n`);
        const result = (0, depAudit_1.executeDepAutoHeal)(workspacePath, plan.branchName);
        console.log(result.message);
    }
    else if (audit.fixableCount > 0) {
        console.log('👉 Run `aigit deps --auto` to automatically branch and fix these vulnerabilities.');
    }
};
exports.default = handler;
