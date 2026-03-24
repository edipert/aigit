import { execFileSync } from 'child_process';

export function getActiveBranch(workspacePath: string): string {
    try {
        return execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: workspacePath, encoding: 'utf-8', stdio: 'pipe' }).trim();
    } catch (e) {
        return 'unknown';
    }
}

export function getChangedFiles(workspacePath: string): string[] {
    try {
        const diff = execFileSync('git', ['diff', '--name-only', 'HEAD'], { cwd: workspacePath, encoding: 'utf-8', stdio: 'pipe' });
        return diff.split('\n').filter(Boolean);
    } catch (e) {
        return [];
    }
}
