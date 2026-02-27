"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mergeContextBranches = mergeContextBranches;
const db_1 = require("../db");
const readline_1 = __importDefault(require("readline"));
const rl = readline_1.default.createInterface({
    input: process.stdin,
    output: process.stdout
});
async function mergeContextBranches(workspacePath, sourceBranch, targetBranch) {
    try {
        await (0, db_1.initializeDatabase)();
        // 1. Dry run: Count how many records belong to the source branch
        const tasksCount = await db_1.prisma.task.count({ where: { gitBranch: sourceBranch } });
        const decisionsCount = await db_1.prisma.decision.count({ where: { gitBranch: sourceBranch } });
        const memoriesCount = await db_1.prisma.memory.count({ where: { gitBranch: sourceBranch } });
        const totalRecords = tasksCount + decisionsCount + memoriesCount;
        if (totalRecords === 0) {
            console.log(`\n✅ [aigit] No semantic context found on branch '${sourceBranch}'. Nothing to merge.\n`);
            process.exit(0);
        }
        console.log(`\n🔍 [aigit] SEMANTIC MERGE DRY RUN`);
        console.log(`Ready to port context from '${sourceBranch}' -> '${targetBranch}':`);
        console.log(`  - ${tasksCount} Tasks`);
        console.log(`  - ${decisionsCount} Architectural Decisions`);
        console.log(`  - ${memoriesCount} Raw Memories`);
        rl.question(`\n⚠️  Are you sure you want to merge these ${totalRecords} records into '${targetBranch}'? (y/N): `, async (answer) => {
            if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
                // 2. Execute the transaction
                console.log(`\nExecuting semantic merge...`);
                await db_1.prisma.$transaction([
                    db_1.prisma.task.updateMany({
                        where: { gitBranch: sourceBranch },
                        data: { gitBranch: targetBranch },
                    }),
                    db_1.prisma.decision.updateMany({
                        where: { gitBranch: sourceBranch },
                        data: { gitBranch: targetBranch },
                    }),
                    db_1.prisma.memory.updateMany({
                        where: { gitBranch: sourceBranch },
                        data: { gitBranch: targetBranch },
                    })
                ]);
                console.log(`✅ [aigit] Successfully merged semantic context from '${sourceBranch}' into '${targetBranch}'.\n`);
            }
            else {
                console.log(`\n❌ [aigit] Merge aborted by user.\n`);
            }
            rl.close();
            await db_1.prisma.$disconnect();
        });
    }
    catch (error) {
        console.error('Failed to merge semantic context:', error);
        rl.close();
        await db_1.prisma.$disconnect();
    }
}
