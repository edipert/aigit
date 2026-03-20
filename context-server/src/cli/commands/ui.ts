import express, { Request, Response, NextFunction } from 'express';
import { prisma } from '../../db';
import type { CommandHandler } from './types';
import chalk from 'chalk';
import path from 'path';
import { spawn } from 'child_process';
import { getActiveBranch } from '../git';

const handler: CommandHandler = async ({ workspacePath }) => {
    const app = express();
    const port = 3001;

    app.use(express.json());

    // CORS for local Vite dev server
    app.use((req: Request, res: Response, next: NextFunction) => {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        if (req.method === 'OPTIONS') {
            return res.sendStatus(200);
        }
        next();
    });

    const currentBranch = getActiveBranch(workspacePath);

    // API: Get Project Stats
    app.get('/api/stats', async (req: Request, res: Response) => {
        try {
            const memoryCount = await prisma.memory.count();
            const decisionCount = await prisma.decision.count();
            const taskCount = await prisma.task.count();
            
            // Agent breakdown
            const memAgents = await prisma.memory.groupBy({
                by: ['agentName'],
                _count: { agentName: true }
            });
            const decAgents = await prisma.decision.groupBy({
                by: ['agentName'],
                _count: { agentName: true }
            });

            res.json({
                totalMemories: memoryCount,
                totalDecisions: decisionCount,
                totalTasks: taskCount,
                memoryAgents: memAgents,
                decisionAgents: decAgents,
                currentBranch
            });
        } catch (error) {
            res.status(500).json({ error: String(error) });
        }
    });

    // API: Get Conflicts
    app.get('/api/conflicts', async (req: Request, res: Response) => {
        try {
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

            res.json({ memories, decisions });
        } catch (error) {
            res.status(500).json({ error: String(error) });
        }
    });

    // API: Resolve Conflict
    app.post('/api/resolve', async (req: Request, res: Response) => {
        try {
            const { type, id, action, content } = req.body;
            // action: 'assimilate' | 'discard' | 'synthesize'

            if (type === 'memory') {
                if (action === 'assimilate') {
                    await prisma.memory.update({ where: { id }, data: { originBranch: currentBranch } });
                } else if (action === 'discard') {
                    await prisma.memory.delete({ where: { id } });
                } else if (action === 'synthesize' && content) {
                    await prisma.memory.update({ where: { id }, data: { originBranch: currentBranch, content } });
                }
            } else if (type === 'decision') {
                if (action === 'assimilate') {
                    await prisma.decision.update({ where: { id }, data: { originBranch: currentBranch } });
                } else if (action === 'discard') {
                    await prisma.decision.delete({ where: { id } });
                }
            }
            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ error: String(error) });
        }
    });

    app.listen(port, () => {
        console.log(chalk.cyan(`\\n🚀 Aigit API Server running on http://localhost:${port}`));
        
        // Start the Vite app
        const uiPath = path.resolve(__dirname, '../../../context-ui');
        console.log(chalk.gray(`Starting UI from ${uiPath}...`));
        
        const vite = spawn('npm', ['run', 'dev'], {
            cwd: uiPath,
            stdio: 'inherit',
            shell: true
        });

        vite.on('error', (err) => {
            console.error(chalk.red(`Failed to start Vite UI: ${err.message}`));
        });
    });
    
    // Keep process alive indefinitely
    await new Promise(() => {});
};

export default handler;
