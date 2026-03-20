import { semanticSearch } from '../../rag/search';
import { detectContextDrift } from '../../diagnostics/drift';
import { prisma } from '../../db';
import type { CommandHandler } from './types';

const HELP = `
🧠 aigit ci-report — Generate CI/CD context reports

Usage:
  aigit ci-report [--pr-title "<title>"] [--changed-files "file1,file2"] [--json]

Description:
  Scans the actively changed files and PR title to find overlapping architectural 
  context, decisions, or potential context drift to be shown in a PR comment.
`;

const handler: CommandHandler = async ({ args, workspacePath }) => {
    if (args.includes('--help') || args.includes('-h')) {
        console.log(HELP);
        return;
    }

    const prTitleIdx = args.indexOf('--pr-title');
    const changedFilesIdx = args.indexOf('--changed-files');
    const jsonIdx = args.indexOf('--json');

    const prTitle = prTitleIdx !== -1 ? args[prTitleIdx + 1] : '';
    let changedFiles: string[] = [];
    if (changedFilesIdx !== -1 && args[changedFilesIdx + 1]) {
        // Can be comma-separated or space-separated if quoted
        const raw = args[changedFilesIdx + 1];
        if (raw.includes(',')) {
            changedFiles = raw.split(',').map(f => f.trim()).filter(Boolean);
        } else {
            changedFiles = raw.split(/\s+/).map(f => f.trim()).filter(Boolean);
        }
    }

    // 1. Semantic search based on PR title
    const searchResults = prTitle ? await semanticSearch({
        query: prTitle,
        topK: 5
    }) : [];

    // 2. Direct file matches
    let directMemories: any[] = [];
    let directDecisions: any[] = [];
    
    if (changedFiles.length > 0) {
        directMemories = await prisma.memory.findMany({
            where: { filePath: { in: changedFiles } }
        });
        
        directDecisions = await prisma.decision.findMany({
            where: { filePath: { in: changedFiles } }
        });
    }

    // 3. Drift detection
    const drift = await detectContextDrift(workspacePath);

    // If --json, output structured data and exit
    if (jsonIdx !== -1) {
        console.log(JSON.stringify({
            prTitle,
            changedFiles,
            semanticMatches: searchResults,
            directMatches: {
                memories: directMemories,
                decisions: directDecisions
            },
            drift
        }, null, 2));
        return;
    }

    // Otherwise, generate Markdown report for GitHub comments
    let md = `## 🧠 aigit Context Review\n\n`;

    if (drift.staleCount > 0) {
        md += `### ⚠️ Context Drift Warnings\n`;
        md += `These architectural memories or decisions appear to be stale based on the current codebase state.\n\n`;
        drift.staleItems.forEach(item => {
            md += `- **[${item.type.toUpperCase()}]**: ${item.reason}\n  > *${item.contentPreview}*\n`;
        });
        md += `\n`;
    } else {
        md += `✅ **No context drift detected.**\n\n`;
    }

    if (prTitle) {
        md += `### 🔍 Semantic Matches for PR Title\n`;
        if (searchResults.length > 0) {
            searchResults.forEach(r => {
                md += `- **[${r.type.toUpperCase()}]** ${r.text} (Score: ${r.score.toFixed(2)})\n`;
            });
        } else {
            md += `No relevant historical design semantic matches found for this topic.\n`;
        }
        md += `\n`;
    }

    if (changedFiles.length > 0) {
        md += `### 📁 Context Anchored to Changed Files\n`;
        const totalDirect = directMemories.length + directDecisions.length;
        if (totalDirect > 0) {
            directMemories.forEach(m => {
                md += `- \`${m.filePath}\`: **[Memory]** ${m.content}\n`;
            });
            directDecisions.forEach(d => {
                md += `- \`${d.filePath}\`: **[Decision]** ${d.context} → ${d.chosen}\n`;
            });
        } else {
            md += `No direct semantic context anchored to these specific files.\n`;
        }
        md += `\n`;
    }

    console.log(md);
};

export default handler;
