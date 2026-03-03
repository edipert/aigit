import fs from 'fs';
import path from 'path';
import { detectAgents } from './registry';

/**
 * Migrate custom skill folders from isolated agent directories (e.g. .claude/skills)
 * into a centralized .aigit/skills directory, and leave behind symlinks.
 */
export function migrateSkills(workspacePath: string): { migrated: string[]; errors: string[] } {
    const agents = detectAgents(workspacePath);
    const aigitSkillsDir = path.join(workspacePath, '.aigit', 'skills');
    const migrated: string[] = [];
    const errors: string[] = [];

    // Ensure .aigit/skills exists
    if (!fs.existsSync(aigitSkillsDir)) {
        fs.mkdirSync(aigitSkillsDir, { recursive: true });
    }

    for (const agent of agents) {
        if (!agent.tool.skillsDir) continue;

        // Skip if the definitions themselves point to .aigit
        if (agent.tool.skillsDir.includes('.aigit')) continue;

        const sourceSkillsDir = path.join(workspacePath, agent.tool.skillsDir);

        if (fs.existsSync(sourceSkillsDir)) {
            const stats = fs.lstatSync(sourceSkillsDir);

            // If it's already a symlink, we assume it has already been migrated or linked intentionally
            if (stats.isSymbolicLink()) {
                continue;
            }

            if (stats.isDirectory()) {
                try {
                    // 1. Copy all contents from source to .aigit/skills
                    copyFolderRecursiveSync(sourceSkillsDir, aigitSkillsDir);

                    // 2. Remove the original physical directory
                    fs.rmSync(sourceSkillsDir, { recursive: true, force: true });

                    // 3. Create a symlink from the original location pointing to .aigit/skills
                    // It's best to use a relative path so the git repo remains portable
                    const relativeLinkPath = path.relative(path.dirname(sourceSkillsDir), aigitSkillsDir);

                    fs.symlinkSync(relativeLinkPath, sourceSkillsDir, 'junction');
                    // 'junction' provides better cross-platform compatibility on Windows for directories, 
                    // although 'dir' works on unix. Node handles 'junction' gracefully on Unix too.

                    migrated.push(agent.tool.skillsDir);
                } catch (error: any) {
                    errors.push(`Failed to migrate ${agent.tool.skillsDir}: ${error.message}`);
                }
            }
        }
    }

    return { migrated, errors };
}

/**
 * Helper utility to deeply copy a directory.
 */
function copyFolderRecursiveSync(source: string, target: string) {
    if (!fs.existsSync(target)) {
        fs.mkdirSync(target, { recursive: true });
    }

    if (fs.lstatSync(source).isDirectory()) {
        const files = fs.readdirSync(source);
        for (const file of files) {
            const curSource = path.join(source, file);
            const curTarget = path.join(target, file);

            if (fs.lstatSync(curSource).isDirectory()) {
                copyFolderRecursiveSync(curSource, curTarget);
            } else {
                fs.copyFileSync(curSource, curTarget);
            }
        }
    }
}
