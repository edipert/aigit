import { getActiveBranch } from './git';
import { generateArchitectureDocs } from '../docs/generator';
import { prisma } from '../db';
import * as fs from 'fs';
import * as path from 'path';

export async function exportDocs(options: { out?: string }) {
    console.log(`[aigit] Scanning context ledger...`);
    const project = await prisma.project.findFirst();

    if (!project) {
        console.error('❌ Could not determine project name. Run aigit init.');
        process.exit(1);
    }
    const branch = getActiveBranch(process.cwd());
    const projectName = project.name;

    try {
        console.log(`[aigit] Generating architecture documentation for ${projectName} on branch ${branch}...`);
        const mdContent = await generateArchitectureDocs(projectName, branch);

        const outPath = options.out ? path.resolve(process.cwd(), options.out) : path.join(process.cwd(), 'ARCHITECTURE.md');

        fs.writeFileSync(outPath, mdContent, 'utf-8');
        console.log(`✅ Success! Generated documentation at: ${outPath}`);
    } catch (err: any) {
        console.error(`❌ Error generating documentation: ${err.message}`);
        process.exit(1);
    }
}
