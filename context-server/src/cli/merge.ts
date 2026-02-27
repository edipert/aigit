import { prisma, initializeDatabase } from '../db';
import readline from 'readline';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

export async function mergeContextBranches(workspacePath: string, sourceBranch: string, targetBranch: string) {
    try {
        await initializeDatabase();
        // 1. Dry run: Count how many records belong to the source branch
        const tasksCount = await prisma.task.count({ where: { gitBranch: sourceBranch } });
        const decisionsCount = await prisma.decision.count({ where: { gitBranch: sourceBranch } });
        const memoriesCount = await prisma.memory.count({ where: { gitBranch: sourceBranch } });

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

                await prisma.$transaction([
                    prisma.task.updateMany({
                        where: { gitBranch: sourceBranch },
                        data: { gitBranch: targetBranch },
                    }),
                    prisma.decision.updateMany({
                        where: { gitBranch: sourceBranch },
                        data: { gitBranch: targetBranch },
                    }),
                    prisma.memory.updateMany({
                        where: { gitBranch: sourceBranch },
                        data: { gitBranch: targetBranch },
                    })
                ]);

                console.log(`✅ [aigit] Successfully merged semantic context from '${sourceBranch}' into '${targetBranch}'.\n`);
            } else {
                console.log(`\n❌ [aigit] Merge aborted by user.\n`);
            }

            rl.close();
            await prisma.$disconnect();
        });

    } catch (error) {
        console.error('Failed to merge semantic context:', error);
        rl.close();
        await prisma.$disconnect();
    }
}
