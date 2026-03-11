import * as path from 'path';
import { prisma } from '../../db';
import { dumpContextLedger } from '../sync';

/**
 * Ensures a default project exists for the given workspace.
 * Extracted from 4 copy-pasted blocks across cli/index.ts.
 */
export async function getOrCreateDefaultProject(workspacePath: string) {
    let project = await prisma.project.findFirst();
    if (!project) {
        project = await prisma.project.create({
            data: { name: path.basename(workspacePath) },
        });
    }
    return project;
}

/**
 * Persists the context ledger after any write operation.
 * Replaces inline `require('./sync').dumpContextLedger(...)` calls.
 */
export async function afterWrite(workspacePath: string): Promise<void> {
    await dumpContextLedger(workspacePath);
}
