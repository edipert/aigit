"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const git_1 = require("../git");
const db_1 = require("../../db");
const utils_1 = require("./utils");
const handler = async ({ args, workspacePath }) => {
    const message = args[0];
    if (!message) {
        console.error('⚠️  Error: You must provide a note message.');
        console.log('Usage: aigit note "<message>" [--scope <path>] [--decision] [--issue <ref>]');
        process.exit(1);
    }
    const branch = (0, git_1.getActiveBranch)(workspacePath);
    const project = await (0, utils_1.getOrCreateDefaultProject)(workspacePath);
    const scopeIdx = args.indexOf('--scope');
    const issueIdx = args.indexOf('--issue');
    const isDecision = args.includes('--decision');
    const filePath = scopeIdx !== -1 ? args[scopeIdx + 1] : null;
    const issueRef = issueIdx !== -1 ? args[issueIdx + 1] : null;
    const memory = await db_1.prisma.memory.create({
        data: {
            projectId: project.id,
            gitBranch: branch,
            type: isDecision ? 'architecture' : 'human_note',
            content: message,
            filePath,
            issueRef,
        },
    });
    await (0, utils_1.afterWrite)(workspacePath);
    console.log(`\n📝 [aigit note] Context captured on branch [${branch}]`);
    if (filePath)
        console.log(`   Scope: 📁 ${filePath}`);
    if (isDecision)
        console.log(`   Tag: Architecture Decision`);
    if (issueRef)
        console.log(`   🔗 Issue: ${issueRef}`);
    console.log(`   ID: ${memory.id}\n`);
};
exports.default = handler;
