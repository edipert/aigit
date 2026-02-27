import fs from 'fs';
import path from 'path';
import { getActiveBranch, getChangedFiles } from './git';
import { detectProjectType } from './environment';

export function compileHydratedContext(workspacePath: string, activeFile?: string): string {
    let payload = '';

    const globalGemini = path.join(workspacePath, 'AGENTS.md');
    if (fs.existsSync(globalGemini)) {
        payload += fs.readFileSync(globalGemini, 'utf8') + '\n\n';
    } else {
        payload += '# AIGIT CONTEXT AUTOMATION\n\n> No AGENTS.md found in this directory.\n\n';
    }

    payload += '## CURRENT ENVIRONMENT\n';
    payload += `- **Git Branch**: ${getActiveBranch(workspacePath)}\n`;
    const changed = getChangedFiles(workspacePath);
    if (changed.length > 0) {
        payload += `- **Changed Files**: ${changed.slice(0, 5).join(', ')}${changed.length > 5 ? '...' : ''}\n`;
    }

    const projectType = detectProjectType(workspacePath);
    payload += `- **Detected Project Type**: ${projectType}\n`;

    if (activeFile) {
        payload += `- **Active File**: ${activeFile}\n`;
    }
    payload += '\n';

    payload += `## CONTEXT HYDRATION\n`;
    payload += `The environment features above have been auto-detected. Please follow the modular loading protocol defined in AGENTS.md and target your execution rules accordingly.\n`;

    return payload;
}
