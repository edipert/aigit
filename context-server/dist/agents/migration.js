"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrateSkills = migrateSkills;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const registry_1 = require("./registry");
/**
 * Migrate custom skill folders from isolated agent directories (e.g. .claude/skills)
 * into a centralized .aigit/skills directory, and leave behind symlinks.
 */
function migrateSkills(workspacePath) {
    const agents = (0, registry_1.detectAgents)(workspacePath);
    const aigitSkillsDir = path_1.default.join(workspacePath, '.aigit', 'skills');
    const migrated = [];
    const errors = [];
    // Ensure .aigit/skills exists
    if (!fs_1.default.existsSync(aigitSkillsDir)) {
        fs_1.default.mkdirSync(aigitSkillsDir, { recursive: true });
    }
    for (const agent of agents) {
        if (!agent.tool.skillsDir)
            continue;
        // Skip if the definitions themselves point to .aigit
        if (agent.tool.skillsDir.includes('.aigit'))
            continue;
        const sourceSkillsDir = path_1.default.join(workspacePath, agent.tool.skillsDir);
        if (fs_1.default.existsSync(sourceSkillsDir)) {
            const stats = fs_1.default.lstatSync(sourceSkillsDir);
            // If it's already a symlink, we assume it has already been migrated or linked intentionally
            if (stats.isSymbolicLink()) {
                continue;
            }
            if (stats.isDirectory()) {
                try {
                    // 1. Copy all contents from source to .aigit/skills
                    copyFolderRecursiveSync(sourceSkillsDir, aigitSkillsDir);
                    // 2. Remove the original physical directory
                    fs_1.default.rmSync(sourceSkillsDir, { recursive: true, force: true });
                    // 3. Create a symlink from the original location pointing to .aigit/skills
                    // It's best to use a relative path so the git repo remains portable
                    const relativeLinkPath = path_1.default.relative(path_1.default.dirname(sourceSkillsDir), aigitSkillsDir);
                    fs_1.default.symlinkSync(relativeLinkPath, sourceSkillsDir, 'junction');
                    // 'junction' provides better cross-platform compatibility on Windows for directories,
                    // although 'dir' works on unix. Node handles 'junction' gracefully on Unix too.
                    migrated.push(agent.tool.skillsDir);
                }
                catch (error) {
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
function copyFolderRecursiveSync(source, target) {
    if (!fs_1.default.existsSync(target)) {
        fs_1.default.mkdirSync(target, { recursive: true });
    }
    if (fs_1.default.lstatSync(source).isDirectory()) {
        const files = fs_1.default.readdirSync(source);
        for (const file of files) {
            const curSource = path_1.default.join(source, file);
            const curTarget = path_1.default.join(target, file);
            if (fs_1.default.lstatSync(curSource).isDirectory()) {
                copyFolderRecursiveSync(curSource, curTarget);
            }
            else {
                fs_1.default.copyFileSync(curSource, curTarget);
            }
        }
    }
}
