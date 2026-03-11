"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const handler = async ({ args }) => {
    const sub = args[0];
    if (sub === 'off') {
        console.log('🛑 [aigit telemetry] To opt-out of anonymous usage data, set the standard environment variable:');
        console.log('\n   export DO_NOT_TRACK=1\n');
        console.log('You can add this to your ~/.bashrc or ~/.zshrc file to make it permanent.');
    }
    else {
        console.log('aigit telemetry off  — Show instructions to disable anonymous usage tracking');
    }
};
exports.default = handler;
