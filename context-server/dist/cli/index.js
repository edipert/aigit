#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const hydration_1 = require("./hydration");
const args = process.argv.slice(2);
const command = args[0];
if (command === 'hydrate') {
    const workspacePath = process.cwd();
    const activeFile = args[1]; // optional
    const context = (0, hydration_1.compileHydratedContext)(workspacePath, activeFile);
    console.log(context);
}
else if (command === 'init-hook') {
    const workspacePath = process.cwd();
    const { installGitHook } = require('./hooks');
    installGitHook(workspacePath);
}
else if (command === 'check-conflicts') {
    const targetBranch = args[1] || 'main'; // Target branch to compare against
    const workspacePath = process.cwd();
    const { checkContextConflicts } = require('./conflict');
    checkContextConflicts(workspacePath, targetBranch);
}
else if (command === 'merge') {
    const sourceBranch = args[1];
    if (!sourceBranch) {
        console.error('⚠️  Error: You must specify a source branch to merge from.');
        console.log('Usage: aigit merge <source-branch> [target-branch]');
        process.exit(1);
    }
    const targetBranch = args[2] || 'main'; // Default to merging into main
    const workspacePath = process.cwd();
    const { mergeContextBranches } = require('./merge');
    mergeContextBranches(workspacePath, sourceBranch, targetBranch);
}
else if (command === 'dump') {
    const workspacePath = process.cwd();
    const { dumpContextLedger } = require('./sync');
    dumpContextLedger(workspacePath);
}
else if (command === 'load') {
    const workspacePath = process.cwd();
    const { loadContextLedger } = require('./sync');
    loadContextLedger(workspacePath);
}
else if (command === 'log') {
    const workspacePath = process.cwd();
    const { showContextLog } = require('./history');
    showContextLog(workspacePath);
}
else if (command === 'status') {
    const workspacePath = process.cwd();
    const { showContextStatus } = require('./history');
    showContextStatus(workspacePath);
}
else if (command === 'revert') {
    const targetId = args[1];
    if (!targetId) {
        console.error('⚠️  Error: You must specify a Context ID to revert.');
        console.log('Usage: aigit revert <context-id>');
        process.exit(1);
    }
    const workspacePath = process.cwd();
    const { revertContextId } = require('./history');
    revertContextId(workspacePath, targetId);
}
else {
    console.log('Usage: aigit hydrate [active-file] OR aigit init-hook OR aigit check-conflicts [branch] OR aigit merge <source> [target] OR aigit dump OR aigit load OR aigit log OR aigit status OR aigit revert <id>');
}
