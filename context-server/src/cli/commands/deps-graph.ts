import { buildDependencyGraph } from '../../diagnostics/depGraph';
import type { CommandHandler } from './types';
import fs from 'fs';
import path from 'path';

const handler: CommandHandler = async ({ workspacePath }) => {
    console.log('\n🕸️  Analyzing project semantic dependencies...\n');

    try {
        const result = await buildDependencyGraph(workspacePath);
        
        console.log(`  📊 Found ${result.totalFiles} tracked files with ${result.totalLinks} total semantic context links.\n`);
        
        const outDir = path.join(workspacePath, '.aigit');
        if (!fs.existsSync(outDir)) {
            fs.mkdirSync(outDir, { recursive: true });
        }
        
        const outPath = path.join(outDir, 'deps-graph.md');
        
        const mdContent = `# Semantic Dependency Graph

This graph shows the relationships between files in your project, combining both code imports and AI semantic links (Memories & Decisions).

\`\`\`mermaid
${result.mermaid}
\`\`\`

> Note: Nodes indicate the number of Memories (M) and Decisions (D) linked to each file.
`;

        fs.writeFileSync(outPath, mdContent);
        console.log(`  ✅ Wrote Mermaid diagram to: ${outPath}`);
        console.log('  Open this file in an editor with Markdown preview (like VS Code) or GitHub to visualize.');
        console.log();
        
    } catch (err) {
        console.error('❌ Failed to build dependency graph:', err);
        process.exit(1);
    }
};

export default handler;
