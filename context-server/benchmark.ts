import { prisma, initializeDatabase } from './src/db';

async function main() {
    await initializeDatabase();

    // Clean up previous runs
    await prisma.decision.deleteMany();
    await prisma.memory.deleteMany();
    await prisma.task.deleteMany();
    await prisma.project.deleteMany();

    const project = await prisma.project.create({
        data: {
            name: 'benchmark_project',
            description: 'A project to benchmark merge_context performance'
        }
    });

    const projectId = project.id;
    const src = 'src-branch';
    const tgt = 'tgt-branch';

    console.log('Generating dummy data...');

    const numMemories = 500;
    const numTasks = 200;
    const numDecisionsPerTask = 5;

    // Create src data
    const memoryData = Array.from({ length: numMemories }, (_, i) => ({
        projectId,
        gitBranch: src,
        type: 'human_note',
        content: `Dummy memory ${i}`,
    }));

    await prisma.memory.createMany({ data: memoryData });

    const tasksData = Array.from({ length: numTasks }, (_, i) => ({
        projectId,
        gitBranch: src,
        slug: `dummy-task-${i}-src`,
        title: `Dummy Task ${i}`,
        status: 'PLANNING'
    }));
    await prisma.task.createMany({ data: tasksData });

    const srcTasks = await prisma.task.findMany({ where: { gitBranch: src } });

    const decisionsData = srcTasks.flatMap((t: any) =>
        Array.from({ length: numDecisionsPerTask }, (_, i) => ({
            taskId: t.id,
            gitBranch: src,
            context: `Context ${i} for task ${t.slug}`,
            chosen: `Chosen ${i}`,
            reasoning: `Reasoning ${i}`,
        }))
    );
    await prisma.decision.createMany({ data: decisionsData });

    console.log(`Created ${numMemories} memories, ${numTasks} tasks, ${srcTasks.length * numDecisionsPerTask} decisions on ${src}.`);

    // Create a subset on tgt branch to simulate partial exists
    const existingMemoriesData = memoryData.slice(0, 100).map(m => ({ ...m, gitBranch: tgt }));
    await prisma.memory.createMany({ data: existingMemoriesData });

    const existingTasksData = tasksData.slice(0, 50).map(t => ({ ...t, gitBranch: tgt, slug: t.slug.replace('-src', '-tgt') }));
    await prisma.task.createMany({ data: existingTasksData });

    console.log('Running merge_context benchmark...');

    const start = performance.now();

    // === START MERGE LOGIC ===
    const [memories, decisions, tasks] = await Promise.all([
        prisma.memory.findMany({ where: { projectId, gitBranch: src } }),
        prisma.decision.findMany({ where: { task: { projectId }, gitBranch: src } }),
        prisma.task.findMany({ where: { projectId, gitBranch: src } }),
    ]);

    let ported = 0;

    // 1. Bulk process memories
    if (memories.length > 0) {
        const existingMemories = await prisma.memory.findMany({
            where: { projectId, gitBranch: tgt },
            select: { content: true }
        });
        const existingContentSet = new Set(existingMemories.map(m => m.content));

        const newMemoriesData = memories
            .filter(m => !existingContentSet.has(m.content))
            .map(m => ({
                projectId: m.projectId, gitBranch: tgt, type: m.type, content: m.content,
                filePath: m.filePath, lineNumber: m.lineNumber,
                symbolName: m.symbolName, symbolType: m.symbolType, symbolRange: m.symbolRange,
            }));

        if (newMemoriesData.length > 0) {
            await prisma.memory.createMany({ data: newMemoriesData });
            ported += newMemoriesData.length;
        }
    }

    // 2. Bulk process tasks
    if (tasks.length > 0) {
        const existingTasks = await prisma.task.findMany({
            where: { projectId, gitBranch: tgt },
            select: { slug: true }
        });
        const existingSlugSet = new Set(existingTasks.map(t => t.slug));

        // For benchmark, we apply the target slug mapping to compare properly
        const newTasks = tasks.map(t => ({...t, slug: t.slug.replace('-src', '-tgt')})).filter(t => !existingSlugSet.has(t.slug));

        if (newTasks.length > 0) {
            // Create tasks individually to get their new IDs for associating decisions.
            // We still save N queries by not checking existence individually.
            for (const t of newTasks) {
                const newTask = await prisma.task.create({
                    data: {
                        projectId: t.projectId, gitBranch: tgt, slug: t.slug, title: t.title, status: t.status,
                    }
                });
                ported++;

                const taskDecisions = decisions.filter((d: any) => d.taskId === t.id);
                if (taskDecisions.length > 0) {
                    await prisma.decision.createMany({
                        data: taskDecisions.map((d: any) => ({
                            taskId: newTask.id, gitBranch: tgt, context: d.context, chosen: d.chosen,
                            rejected: d.rejected as string[], reasoning: d.reasoning,
                            filePath: d.filePath, lineNumber: d.lineNumber,
                            symbolName: d.symbolName, symbolType: d.symbolType, symbolRange: d.symbolRange,
                        }))
                    });
                    ported += taskDecisions.length;
                }
            }
        }
    }
    // === END MERGE LOGIC ===

    const end = performance.now();
    console.log(`Ported ${ported} entries.`);
    console.log(`merge_context took ${(end - start).toFixed(2)} ms.`);
}

main().catch(console.error);
