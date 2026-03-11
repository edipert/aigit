"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const conflict_1 = require("../conflict");
const merge_1 = require("../merge");
const handler = async ({ args, workspacePath, command }) => {
    if (command === 'check-conflicts') {
        const targetBranch = args[0] || 'main';
        await (0, conflict_1.checkContextConflicts)(workspacePath, targetBranch);
    }
    else if (command === 'merge') {
        const sourceBranch = args[0];
        if (!sourceBranch) {
            console.error('⚠️  Error: You must specify a source branch to merge from.');
            console.log('Usage: aigit merge <source-branch> [target-branch]');
            process.exit(1);
        }
        const targetBranch = args[1] || 'main';
        await (0, merge_1.mergeContextBranches)(workspacePath, sourceBranch, targetBranch);
    }
};
exports.default = handler;
