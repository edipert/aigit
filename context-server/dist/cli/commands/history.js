"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const history_1 = require("../history");
const handler = async ({ args, workspacePath, command }) => {
    if (command === 'log') {
        await (0, history_1.showContextLog)(workspacePath);
    }
    else if (command === 'status') {
        await (0, history_1.showContextStatus)(workspacePath);
    }
    else if (command === 'revert') {
        const targetId = args[0];
        if (!targetId) {
            console.error('⚠️  Error: You must specify a Context ID to revert.');
            console.log('Usage: aigit revert <context-id>');
            process.exit(1);
        }
        await (0, history_1.revertContextId)(workspacePath, targetId);
    }
};
exports.default = handler;
