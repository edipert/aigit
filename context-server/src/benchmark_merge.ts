import { prisma, initializeDatabase } from './db';
import { v4 as uuidv4 } from 'uuid';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
// We don't want to import everything to trigger the server startup, but we can just copy the logic here directly to ensure we're measuring identically, or just use the logic we wrote.
// Actually, to make sure we're testing the EXACT code from index.ts, we should use the same logic here.

async function main() {
    await initializeDatabase();

    const projectName = 'benchmark-project';
    let project = await prisma.project.findUnique({ where: { name: projectName } });

    if (!project) {
        project = await prisma.project.create({
            data: { name: projectName }
        });
    }

    const projectId = project.id;
    const runId = uuidv4().slice(0, 8);
    const src = `feature/benchmark-source-${runId}`;
    const tgt = `benchmark-target-${runId}`;

    console.log('Generating dummy data on source branch...');
    const memoryCount = 500;
    const taskCount = 100;
    const decisionsPerTask = 3;

    // Generate Memories
    const memoriesData = Array.from({ length: memoryCount }).map((_, i) => ({
        projectId,
        gitBranch: src,
        type: 'human_note',
        content: `Benchmark memory content ${i} - ${uuidv4()}`
    }));
    await prisma.memory.createMany({ data: memoriesData });

    // Generate Tasks and Decisions
    for (let i = 0; i < taskCount; i++) {
        const uniqueSlug = `benchmark-task-${uuidv4()}`;
        const task = await prisma.task.create({
            data: {
                projectId,
                gitBranch: src,
                slug: uniqueSlug,
                title: `Benchmark Task ${i}`,
                status: 'PLANNING'
            }
        });

        const decisionsData = Array.from({ length: decisionsPerTask }).map((_, j) => ({
            taskId: task.id,
            gitBranch: src,
            context: `Context for decision ${j} of task ${i}`,
            chosen: `Chosen path ${j}`,
            rejected: [`Rejected path ${j}a`, `Rejected path ${j}b`],
            reasoning: `Reasoning for decision ${j} of task ${i}`
        }));
        await prisma.decision.createMany({ data: decisionsData });
    }

    console.log(`Generated ${memoryCount} memories and ${taskCount} tasks (with ${taskCount * decisionsPerTask} decisions) on ${src}.`);

    // The merge_context logic
    console.log('\nRunning optimized merge_context logic...');

    const startTime = performance.now();

    const [memories, decisions, tasks, targetMemories, targetTasks] = await Promise.all([
        prisma.memory.findMany({ where: { projectId, gitBranch: src } }),
        prisma.decision.findMany({ where: { task: { projectId }, gitBranch: src } }),
        prisma.task.findMany({ where: { projectId, gitBranch: src } }),
        prisma.memory.findMany({ where: { projectId, gitBranch: tgt }, select: { content: true } }),
        prisma.task.findMany({ where: { projectId, gitBranch: tgt }, select: { slug: true } })
    ]);

    let ported = 0;

    const targetMemoryContents = new Set(targetMemories.map(m => m.content));
    const targetTaskSlugs = new Set(targetTasks.map(t => t.slug));

    const memoriesToInsert = memories
        .filter(m => !targetMemoryContents.has(m.content))
        .map(m => ({
            projectId: m.projectId, gitBranch: tgt, type: m.type, content: m.content,
            filePath: m.filePath, lineNumber: m.lineNumber,
            symbolName: m.symbolName, symbolType: m.symbolType, symbolRange: m.symbolRange,
        }));

    if (memoriesToInsert.length > 0) {
        await prisma.memory.createMany({ data: memoriesToInsert });
        ported += memoriesToInsert.length;
    }

    const tasksToInsert: any[] = [];
    const decisionsToInsert: any[] = [];

    for (const t of tasks) {
        const mergedSlug = `${t.slug}-${tgt}`;
        const targetSlug = targetTaskSlugs.has(t.slug) ? t.slug : mergedSlug;

        if (!targetTaskSlugs.has(targetSlug)) {
            const newTaskId = uuidv4();
            tasksToInsert.push({
                id: newTaskId,
                projectId: t.projectId, gitBranch: tgt, slug: mergedSlug, title: t.title, status: t.status,
            });

            const taskDecisions = decisions.filter(d => d.taskId === t.id);
            if (taskDecisions.length > 0) {
                decisionsToInsert.push(...taskDecisions.map(d => ({
                    taskId: newTaskId, gitBranch: tgt, context: d.context, chosen: d.chosen,
                    rejected: d.rejected as string[], reasoning: d.reasoning,
                    filePath: d.filePath, lineNumber: d.lineNumber,
                    symbolName: d.symbolName, symbolType: d.symbolType, symbolRange: d.symbolRange,
                })));
            }
        }
    }

    if (tasksToInsert.length > 0) {
        await prisma.task.createMany({ data: tasksToInsert });
        ported += tasksToInsert.length;
    }
    if (decisionsToInsert.length > 0) {
        await prisma.decision.createMany({ data: decisionsToInsert });
        ported += decisionsToInsert.length;
    }

    const endTime = performance.now();
    const durationMs = endTime - startTime;

    console.log(`\nMerge completed. Ported ${ported} items.`);
    console.log(`Time taken: ${durationMs.toFixed(2)} ms`);

    // Clean up again
    console.log('\nCleaning up benchmark data...');
    await prisma.decision.deleteMany({ where: { task: { projectId }, gitBranch: { in: [src, tgt] } } });
    await prisma.task.deleteMany({ where: { projectId, gitBranch: { in: [src, tgt] } } });
    await prisma.memory.deleteMany({ where: { projectId, gitBranch: { in: [src, tgt] } } });

    console.log('Done.');
    process.exit(0);
}

main().catch(console.error);
