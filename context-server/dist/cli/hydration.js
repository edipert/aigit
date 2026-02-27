"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.compileHydratedContext = compileHydratedContext;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const git_1 = require("./git");
const environment_1 = require("./environment");
function compileHydratedContext(workspacePath, activeFile) {
    let payload = '';
    const globalGemini = path_1.default.join(workspacePath, 'AGENTS.md');
    if (fs_1.default.existsSync(globalGemini)) {
        payload += fs_1.default.readFileSync(globalGemini, 'utf8') + '\n\n';
    }
    else {
        payload += '# AIGIT CONTEXT AUTOMATION\n\n> No AGENTS.md found in this directory.\n\n';
    }
    payload += '## CURRENT ENVIRONMENT\n';
    payload += `- **Git Branch**: ${(0, git_1.getActiveBranch)(workspacePath)}\n`;
    const changed = (0, git_1.getChangedFiles)(workspacePath);
    if (changed.length > 0) {
        payload += `- **Changed Files**: ${changed.slice(0, 5).join(', ')}${changed.length > 5 ? '...' : ''}\n`;
    }
    const projectType = (0, environment_1.detectProjectType)(workspacePath);
    payload += `- **Detected Project Type**: ${projectType}\n`;
    if (activeFile) {
        payload += `- **Active File**: ${activeFile}\n`;
    }
    payload += '\n';
    payload += `## CONTEXT HYDRATION\n`;
    payload += `The environment features above have been auto-detected. Please follow the modular loading protocol defined in AGENTS.md and target your execution rules accordingly.\n`;
    return payload;
}
