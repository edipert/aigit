import { PrismaClient } from '@prisma/client';

async function bench() {
    console.log('Using SQLite or whatever default is set up...');

    // Instead of instantiating manually, let's use the export from db.ts
    // which seems to properly initialize Prisma
    const { prisma, initializeDatabase } = await import('./src/db');
    await initializeDatabase();

    // Clean up from previous run if any
    const projectId = "proj-bench-1";
    await prisma.decision.deleteMany({ where: { task: { projectId } } });
    await prisma.task.deleteMany({ where: { projectId } });
    await prisma.project.deleteMany({ where: { id: projectId } });

    // Prepare data
    await prisma.project.create({ data: { id: projectId, name: "bench-project" } });

    const tgt = "bench-target-branch";
    const src = "bench-source-branch";

    console.log('Inserting source task...');
    const t = await prisma.task.create({
        data: {
            id: "task-bench-1",
            projectId,
            slug: "bench-task",
            title: "Bench Task",
            gitBranch: src,
            status: "PLANNING"
        }
    });

    const numDecisions = 1000;
    console.log(`Inserting ${numDecisions} source decisions...`);

    // Using fast insert to set up the data
    const decisionsToInsert = [];
    for (let i = 0; i < numDecisions; i++) {
        decisionsToInsert.push({
            id: `dec-bench-${i}`,
            taskId: t.id,
            gitBranch: src,
            context: `context-${i}`,
            chosen: `chosen-${i}`,
            rejected: [`rej-${i}`],
            reasoning: `reason-${i}`
        });
    }
    await prisma.decision.createMany({ data: decisionsToInsert });

    const decisions = await prisma.decision.findMany({ where: { taskId: t.id } });

    console.log('Starting benchmark: Batch insertions...');

    // CREATE TARGET TASK
    const newTask = await prisma.task.create({
        data: {
            id: "task-bench-tgt-1",
            projectId: t.projectId,
            gitBranch: tgt,
            slug: "bench-task-tgt",
            title: t.title,
            status: t.status,
        }
    });

    const taskDecisions = decisions.filter(d => d.taskId === t.id);

    const start = performance.now();
    let ported = 0;

    // NEW BATCH CODE
    const decisionData = taskDecisions.map(d => ({
        taskId: newTask.id, gitBranch: tgt, context: d.context, chosen: d.chosen,
        rejected: d.rejected as string[], reasoning: d.reasoning,
        filePath: d.filePath, lineNumber: d.lineNumber,
        symbolName: d.symbolName, symbolType: d.symbolType, symbolRange: d.symbolRange,
    }));
    await prisma.decision.createMany({ data: decisionData });
    ported += taskDecisions.length;

    const end = performance.now();
    console.log(`Optimized Execution Time: ${(end - start).toFixed(2)} ms for ${ported} decisions`);

    // Cleanup so we can run again
    await prisma.decision.deleteMany({ where: { taskId: { in: [t.id, newTask.id] } } });
    await prisma.task.deleteMany({ where: { id: { in: [t.id, newTask.id] } } });
    await prisma.project.delete({ where: { id: projectId } });

    process.exit(0);
}

bench().catch(e => {
    console.error(e);
    process.exit(1);
});
