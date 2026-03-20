import readline from 'readline';
import { prisma } from '../../db';
import type { CommandHandler } from './types';
import chalk from 'chalk';

const handler: CommandHandler = async ({ workspacePath, command }) => {
    const { getActiveBranch } = await import('../git');
    const currentBranch = getActiveBranch(workspacePath);

    console.log(chalk.cyan(`\n🔍 Scanning for unassimilated context on branch '${currentBranch}'...\n`));

    // Find memories where originBranch != gitBranch (i.e. brought in via merge)
    const memories = await prisma.memory.findMany({
        where: {
            gitBranch: currentBranch,
            originBranch: { not: null, notIn: [currentBranch] }
        }
    });

    const decisions = await prisma.decision.findMany({
        where: {
            gitBranch: currentBranch,
            originBranch: { not: null, notIn: [currentBranch] }
        }
    });

    const total = memories.length + decisions.length;
    if (total === 0) {
        console.log(chalk.green(`✅ No unassimilated context found. Your context ledger is clean.`));
        return;
    }

    console.log(chalk.yellow(`Found ${total} items originating from other branches.\n`));

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    const ask = (prompt: string): Promise<string> => {
        return new Promise(resolve => rl.question(prompt, resolve));
    };

    // Helper map for decisions/memories
    for (let i = 0; i < memories.length; i++) {
        const m = memories[i];
        console.log(chalk.blue(`=== Memory Context ${i + 1}/${total} ===`));
        console.log(`Type: ${m.type}`);
        console.log(`Origin Branch: ${m.originBranch}`);
        if (m.filePath) console.log(`File: ${m.filePath}`);
        console.log(`\nContent:`);
        console.log(chalk.gray(m.content));
        console.log(`\n============================`);

        let valid = false;
        while (!valid) {
            console.log(`Options:`);
            console.log(`  [1] Keep (Assimilate into ${currentBranch})`);
            console.log(`  [2] Discard`);
            console.log(`  [3] Synthesize (Edit manually)`);
            const choice = (await ask(`Select an option (1-3): `)).trim();

            if (choice === '1') {
                await prisma.memory.update({
                    where: { id: m.id },
                    data: { originBranch: currentBranch }
                });
                console.log(chalk.green(`✓ Assimilated.\n`));
                valid = true;
            } else if (choice === '2') {
                await prisma.memory.delete({ where: { id: m.id } });
                console.log(chalk.red(`✓ Discarded.\n`));
                valid = true;
            } else if (choice === '3') {
                const newContent = await ask(`Enter synthesized content: `);
                await prisma.memory.update({
                    where: { id: m.id },
                    data: { content: newContent, originBranch: currentBranch }
                });
                console.log(chalk.green(`✓ Synthesized.\n`));
                valid = true;
            } else {
                console.log(chalk.red(`Invalid choice. Please try again.\n`));
            }
        }
    }

    for (let i = 0; i < decisions.length; i++) {
        const d = decisions[i];
        console.log(chalk.magenta(`=== Decision Context ${memories.length + i + 1}/${total} ===`));
        console.log(`Origin Branch: ${d.originBranch}`);
        if (d.filePath) console.log(`File: ${d.filePath}`);
        console.log(`\nContext: ${d.context}`);
        console.log(`Chosen: ${d.chosen}`);
        console.log(`Reasoning: ${d.reasoning}`);
        console.log(`\n==============================`);

        let valid = false;
        while (!valid) {
            console.log(`Options:`);
            console.log(`  [1] Keep (Assimilate into ${currentBranch})`);
            console.log(`  [2] Discard`);
            const choice = (await ask(`Select an option (1-2): `)).trim();

            if (choice === '1') {
                await prisma.decision.update({
                    where: { id: d.id },
                    data: { originBranch: currentBranch }
                });
                console.log(chalk.green(`✓ Assimilated.\n`));
                valid = true;
            } else if (choice === '2') {
                await prisma.decision.delete({ where: { id: d.id } });
                console.log(chalk.red(`✓ Discarded.\n`));
                valid = true;
            } else {
                console.log(chalk.red(`Invalid choice. Please try again.\n`));
            }
        }
    }

    console.log(chalk.green(`\n🎉 Resolution complete!`));
    rl.close();
};

export default handler;
