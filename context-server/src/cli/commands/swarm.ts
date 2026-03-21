import { getActiveBranch } from '../git';
import { prisma } from '../../db';
import { createSwarm, getSwarmStatus, haltSwarm, resumeSwarm, listActiveSwarms } from '../../swarm/swarm';
import { listConflicts, resolveConflict } from '../../swarm/conflict';
import type { CommandHandler } from './types';

const HELP = `
🐝 aigit swarm — Multi-Agent Orchestration

Commands:
  swarm "<goal>"          Create a new swarm session
  swarm status            View swarm state (agents, turns, conflicts)
  swarm halt <id>         Halt an active swarm
  swarm resume <id>       Resume a halted swarm
  swarm conflicts         List unresolved swarm conflicts
  swarm resolve <id> <r>  Resolve a conflict with resolution text
`;

const handler: CommandHandler = async ({ args, workspacePath }) => {
    const subCommand = args[0];

    if (subCommand === 'status') {
        const swarms = await listActiveSwarms();
        for (const swarm of swarms) {
            const statusEmoji: Record<string, string> = { PENDING: '⏳', ACTIVE: '🔄', HALTED: '⚠️', DONE: '✅', FAILED: '❌' };
            console.log(`\n🐝 SWARM: ${swarm.goal}`);
            console.log(`   Status: ${statusEmoji[swarm.status] || '❓'} ${swarm.status} — Turn ${swarm.currentTurn}/${swarm.totalTurns}`);
            console.log(`   Branch: ${swarm.gitBranch}\n`);
            console.log('   AGENTS:');
            for (const agent of swarm.agents) {
                const emoji: Record<string, string> = { IDLE: '⏳', WORKING: '🔄', DONE: '✅', BLOCKED: '🚫' };
                console.log(`   ${agent.turnOrder}. ${emoji[agent.status] || '❓'} ${agent.agentName} (${agent.role}) — ${agent.status} [${agent.taskSlug || 'no task'}]`);
            }
        }
    } else if (subCommand === 'halt') {
        const swarmId = args[1];
        if (!swarmId) { console.error('Usage: aigit swarm halt <swarmId>'); process.exit(1); }
        await haltSwarm(swarmId);
        console.log(`⛔ Swarm ${swarmId} halted.`);
    } else if (subCommand === 'resume') {
        const swarmId = args[1];
        if (!swarmId) { console.error('Usage: aigit swarm resume <swarmId>'); process.exit(1); }
        await resumeSwarm(swarmId);
        console.log(`▶️ Swarm ${swarmId} resumed.`);
    } else if (subCommand === 'conflicts') {
        const conflicts = await listConflicts();
        let totalConflicts = conflicts.length;

        // Group conflicts by swarm for display
        const groupedConflicts: Record<string, { goal: string, conflicts: typeof conflicts }> = {};
        for (const c of conflicts) {
            if (!groupedConflicts[c.swarmId]) {
                groupedConflicts[c.swarmId] = { goal: c.swarm.goal, conflicts: [] };
            }
            groupedConflicts[c.swarmId].conflicts.push(c);
        }

        for (const [swarmId, group] of Object.entries(groupedConflicts)) {
            console.log(`\n⚠️  ${group.conflicts.length} conflict(s) in swarm "${group.goal}":\n`);
            for (const c of group.conflicts) {
                try {
                    const payload = JSON.parse(c.payload);
                    console.log(`   CONFLICT ${c.id.substring(0, 8)}:`);
                    console.log(`   ${c.fromAgent.role}: ${payload.reason}`);
                    console.log(`   Blocked: ${payload.blockedDecision}`);
                    if (payload.filePath) console.log(`   📁 ${payload.filePath}${payload.symbolName ? ` ⚓ @${payload.symbolName}` : ''}`);
                    console.log('');
                } catch { /* skip unparseable */ }
            }
        }

        if (totalConflicts === 0) console.log('✅ No unresolved swarm conflicts.');
    } else if (subCommand === 'resolve') {
        const conflictId = args[1];
        const resolution = args.slice(2).join(' ');
        if (!conflictId || !resolution) {
            console.error('Usage: aigit swarm resolve <conflictId> <resolution>');
            process.exit(1);
        }
        await resolveConflict(conflictId, resolution);
        console.log(`✅ Conflict resolved: ${resolution}`);
    } else if (subCommand && subCommand !== '--help') {
        // Treat as a goal — create a swarm
        const goal = subCommand;
        const branch = getActiveBranch(workspacePath);
        const projects = await prisma.project.findMany({ take: 1 });
        if (projects.length === 0) {
            console.error('No project found. Run `aigit init` first.');
            process.exit(1);
        }
        const swarm = await createSwarm(projects[0].id, goal, branch, []);
        if (!swarm) { console.error('Failed to create swarm.'); process.exit(1); }
        console.log(`\n🐝 [aigit swarm] Session created: ${swarm.id.substring(0, 12)}`);
        console.log(`   Goal: ${goal}`);
        console.log(`   Branch: ${branch}`);
        console.log(`   Status: PENDING — waiting for agents to register`);
        console.log(`\n   Agents can join via MCP: register_agent(swarmId: '${swarm.id}', role: '...')\n`);
    } else {
        console.log(HELP);
    }
};

export default handler;
