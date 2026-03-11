"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const runner_1 = require("../../healing/runner");
const output_1 = require("../output");
const handler = async ({ args, workspacePath }) => {
    const subCommand = args[0];
    if (subCommand === 'status') {
        const history = await (0, runner_1.getHealingHistory)();
        console.log(history);
        return;
    }
    if (subCommand === 'retry') {
        const eventId = args[1];
        if (!eventId) {
            (0, output_1.fail)('Please provide a healing event ID to retry.');
            process.exit(1);
        }
        const auto = args.includes('--auto');
        const result = await (0, output_1.withSpinner)(`Retrying healing event ${eventId}…`, () => (0, runner_1.retryHealingEvent)(eventId, workspacePath, { auto }));
        console.log(result.report);
        return;
    }
    const auto = args.includes('--auto');
    const cmdIdx = args.indexOf('--cmd');
    const cmd = cmdIdx !== -1 && args[cmdIdx + 1] ? args[cmdIdx + 1] : undefined;
    const result = await (0, output_1.withSpinner)('Running tests and diagnosing failures…', () => (0, runner_1.healFromTestFailure)(workspacePath, { auto, cmd, quiet: true }));
    console.log(result.report);
    if (!result.success && !auto) {
        (0, output_1.info)('Run `aigit heal --auto` to automatically commit fixes to semantic memory.');
        process.exit(1);
    }
};
exports.default = handler;
