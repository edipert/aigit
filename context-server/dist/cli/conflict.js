"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkContextConflicts = checkContextConflicts;
const db_1 = require("../db");
async function checkContextConflicts(workspacePath, targetBranch) {
    try {
        await (0, db_1.initializeDatabase)();
        const conflicts = await db_1.prisma.decision.findMany({
            where: { gitBranch: targetBranch },
        });
        if (conflicts.length > 0) {
            console.log(`\n⚠️  [aigit] CONTEXT CONFLICT WARNING`);
            console.log(`Branch '${targetBranch}' contains ${conflicts.length} architectural decisions that might conflict with main.`);
            console.log(`Run 'aigit blame ${targetBranch}' to review the isolated semantic memory before merging code.\n`);
        }
        else {
            console.log(`\n✅ [aigit] No semantic context conflicts detected on branch '${targetBranch}'.\n`);
        }
    }
    catch (error) {
        console.error('Failed to check context conflicts:', error);
    }
    finally {
        await db_1.prisma.$disconnect();
    }
}
