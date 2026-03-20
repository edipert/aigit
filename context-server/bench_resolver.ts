import { PrismaClient } from '@prisma/client';
import path from 'path';

async function bench() {
    console.log('Initializing database...');
    const { prisma, initializeDatabase } = await import('./src/db');
    await initializeDatabase();

    const { anchorFileToSymbols } = await import('./src/ast/resolver');

    const projectId = "proj-bench-resolver";
    const taskId = "task-bench-resolver";
    const filePath = "src/dummy.ts";
    const workspacePath = process.cwd();

    // Cleanup from previous runs
    await prisma.decision.deleteMany({ where: { task: { projectId } } });
    await prisma.memory.deleteMany({ where: { project: { id: projectId } } });
    await prisma.task.deleteMany({ where: { projectId } });
    await prisma.project.deleteMany({ where: { id: projectId } });

    // Create Dummy File
    const fs = require('fs');
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, `
export function dummyFunction() {
    console.log("Hello, World!");
}
export class DummyClass {
    dummyMethod() {
        return true;
    }
}
    `);

    // Prepare project and task
    await prisma.project.create({ data: { id: projectId, name: "bench-resolver" } });
    await prisma.task.create({
        data: {
            id: taskId,
            projectId,
            slug: "bench-task",
            title: "Bench Task",
            gitBranch: "main",
            status: "PLANNING"
        }
    });

    const numRecords = 500;
    console.log(`Inserting ${numRecords} unanchored Memory and Decision records...`);

    const memoriesToInsert = [];
    const decisionsToInsert = [];
    for (let i = 0; i < numRecords; i++) {
        memoriesToInsert.push({
            id: `mem-${i}`,
            projectId,
            type: "ARCHITECTURE",
            content: `memory content ${i}`,
            filePath,
            lineNumber: 2 // Corresponds to dummyFunction
        });
        decisionsToInsert.push({
            id: `dec-${i}`,
            taskId,
            gitBranch: "main",
            context: `context-${i}`,
            chosen: `chosen-${i}`,
            rejected: [`rej-${i}`],
            reasoning: `reason-${i}`,
            filePath,
            lineNumber: 6 // Corresponds to dummyMethod
        });
    }

    await prisma.memory.createMany({ data: memoriesToInsert });
    await prisma.decision.createMany({ data: decisionsToInsert });

    console.log('Starting benchmark: Resolving and Updating N+1 records...');

    const start = performance.now();

    // The actual function call we are benchmarking
    const result = await anchorFileToSymbols(filePath, workspacePath);

    const end = performance.now();
    console.log(`Execution Time: ${(end - start).toFixed(2)} ms for ${result.anchored} anchored records`);

    // Cleanup
    await prisma.decision.deleteMany({ where: { taskId } });
    await prisma.memory.deleteMany({ where: { projectId } });
    await prisma.task.deleteMany({ where: { projectId } });
    await prisma.project.deleteMany({ where: { id: projectId } });
    fs.unlinkSync(filePath);

    process.exit(0);
}

bench().catch(e => {
    console.error(e);
    process.exit(1);
});
