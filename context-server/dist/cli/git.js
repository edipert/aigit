"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getActiveBranch = getActiveBranch;
exports.getChangedFiles = getChangedFiles;
const child_process_1 = require("child_process");
function getActiveBranch(workspacePath) {
    try {
        return (0, child_process_1.execSync)('git rev-parse --abbrev-ref HEAD', { cwd: workspacePath, encoding: 'utf-8', stdio: 'pipe' }).trim();
    }
    catch (e) {
        return 'unknown';
    }
}
function getChangedFiles(workspacePath) {
    try {
        const diff = (0, child_process_1.execSync)('git diff --name-only HEAD', { cwd: workspacePath, encoding: 'utf-8', stdio: 'pipe' });
        return diff.split('\n').filter(Boolean);
    }
    catch (e) {
        return [];
    }
}
