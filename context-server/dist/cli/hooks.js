"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.installGitHook = installGitHook;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
function installGitHook(workspacePath) {
    const hooksDir = path_1.default.join(workspacePath, '.git', 'hooks');
    if (!fs_1.default.existsSync(hooksDir)) {
        console.error('⚠️  No .git/hooks directory found. Is this a Git repository? Please initialize git first.');
        return;
    }
    // 1. post-checkout hook (Runs after git checkout)
    const postCheckoutPath = path_1.default.join(hooksDir, 'post-checkout');
    const postCheckoutContent = `#!/bin/sh
# aigit post-checkout hook
# Restores the AI Context Engine memory from the Git-tracked ledger when switching branches.

BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo "[aigit] Context Engine shifted to branch: $BRANCH"

npx --no-install aigit load || npx --no-install aigit load || true
`;
    // 2. post-merge hook (Runs after git pull / git merge)
    const postMergePath = path_1.default.join(hooksDir, 'post-merge');
    const postMergeContent = `#!/bin/sh
# aigit post-merge hook
# Restores the AI Context Engine memory after pulling updates from remote.

echo "[aigit] Syncing AI contextual memory with newly merged remote ledger..."

npx --no-install aigit load || npx --no-install aigit load || true
`;
    // 3. pre-commit hook (Runs before git commit)
    const preCommitPath = path_1.default.join(hooksDir, 'pre-commit');
    const preCommitContent = `#!/bin/sh
# aigit pre-commit hook
# Evaluates staged files to auto-generate context memory, then serializes memory into the Git-tracked ledger before committing.

echo "[aigit] Generating AI-readable context for staged files..."
if ! npx --no-install aigit commit staged; then
    exit 1
fi

echo "[aigit] Serializing active memory into ledger.json..."
npx --no-install aigit dump || npx --no-install aigit dump || true

# Automatically stage the updated ledger if it exists
if [ -f .aigit/ledger.json ]; then
    git add .aigit/ledger.json
fi
`;
    // 4. pre-push hook (Runs before git push)
    const prePushPath = path_1.default.join(hooksDir, 'pre-push');
    const prePushContent = `#!/bin/sh
# aigit pre-push hook
# Runs the self-healing test engine to ensure code is healthy before pushing.

echo "[aigit] Running self-healing diagnostics..."

npx --no-install aigit heal || npx --no-install aigit heal || true

# If tests failed, print a warning but usually don't block the push aggressively unless configured to
echo "[aigit] Diagnostics complete. Proceeding with push..."
`;
    const postCommitPath = path_1.default.join(hooksDir, 'post-commit');
    try {
        fs_1.default.writeFileSync(postCheckoutPath, postCheckoutContent, { mode: 0o755 });
        fs_1.default.writeFileSync(postMergePath, postMergeContent, { mode: 0o755 });
        fs_1.default.writeFileSync(preCommitPath, preCommitContent, { mode: 0o755 });
        fs_1.default.writeFileSync(prePushPath, prePushContent, { mode: 0o755 });
        // Remove legacy post-commit hook if it exists to fix the infinite dirtiness loop
        if (fs_1.default.existsSync(postCommitPath)) {
            fs_1.default.unlinkSync(postCommitPath);
        }
        console.log(`✅ [aigit] Git hooks successfully installed at .git/hooks (post-checkout, post-merge, pre-commit, pre-push)`);
        // Ensure .aigit is ignored properly, but track ledger.json
        const gitignorePath = path_1.default.join(workspacePath, '.gitignore');
        const ignoreEntries = ['\n# aigit local database', '.aigit/memory.db*', '!.aigit/ledger.json', ''];
        let shouldAppendIgnore = true;
        if (fs_1.default.existsSync(gitignorePath)) {
            const ignoreContent = fs_1.default.readFileSync(gitignorePath, 'utf8');
            if (ignoreContent.includes('.aigit/memory.db')) {
                shouldAppendIgnore = false;
            }
        }
        if (shouldAppendIgnore) {
            fs_1.default.appendFileSync(gitignorePath, ignoreEntries.join('\n'), 'utf8');
            console.log(`✅ [aigit] Updated .gitignore to exclude local PGlite binaries but keep ledger.json tracked.`);
        }
    }
    catch (error) {
        console.error('❌ Failed to install Git hooks:', error);
    }
}
