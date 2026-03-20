import fs from 'fs';
import path from 'path';
import { prisma } from '../db';

export interface DepNode {
    file: string;
    imports: string[];
    linkedMemories: number;
    linkedDecisions: number;
    staleRisk: boolean;
}

export interface DepGraphResult {
    nodes: DepNode[];
    totalFiles: number;
    totalLinks: number;
    mermaid: string;
}

/**
 * Extract import statements from a TypeScript/JavaScript file.
 */
function extractImports(filePath: string): string[] {
    try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const imports: string[] = [];

        // Match ES6 imports: import ... from '...'
        const esRegex = /import\s+.*?\s+from\s+['"](\.\.?\/[^'"]+)['"]/g;
        let match: RegExpExecArray | null;
        while ((match = esRegex.exec(content)) !== null) {
            imports.push(match[1]);
        }

        // Match require: require('...')
        const cjsRegex = /require\s*\(\s*['"](\.\.?\/[^'"]+)['"]\s*\)/g;
        while ((match = cjsRegex.exec(content)) !== null) {
            imports.push(match[1]);
        }

        return imports;
    } catch {
        return [];
    }
}

/**
 * Resolve a relative import to its absolute path, trying common extensions.
 */
function resolveImport(from: string, importPath: string): string | null {
    const dir = path.dirname(from);
    const base = path.resolve(dir, importPath);
    const candidates = [base, `${base}.ts`, `${base}.tsx`, `${base}.js`, `${base}.jsx`, path.join(base, 'index.ts'), path.join(base, 'index.js')];

    for (const c of candidates) {
        if (fs.existsSync(c)) return c;
    }
    return null;
}

/**
 * Walk a directory and collect source files.
 */
function collectSourceFiles(dir: string, extensions = ['.ts', '.tsx', '.js', '.jsx']): string[] {
    const results: string[] = [];
    const ignore = ['node_modules', 'dist', '.git', '.next', 'build', 'coverage'];

    function walk(d: string) {
        try {
            const entries = fs.readdirSync(d, { withFileTypes: true });
            for (const entry of entries) {
                if (ignore.includes(entry.name)) continue;
                const full = path.join(d, entry.name);
                if (entry.isDirectory()) walk(full);
                else if (extensions.some(ext => entry.name.endsWith(ext))) results.push(full);
            }
        } catch { /* permission errors */ }
    }

    walk(dir);
    return results;
}

/**
 * Build a dependency graph combining file imports with semantic memory links.
 */
export async function buildDependencyGraph(workspacePath: string): Promise<DepGraphResult> {
    const sourceFiles = collectSourceFiles(workspacePath);
    const relPath = (f: string) => path.relative(workspacePath, f);

    // Get all memories and decisions with file paths
    const [memories, decisions] = await Promise.all([
        prisma.memory.findMany({ where: { filePath: { not: null } }, select: { filePath: true } }),
        prisma.decision.findMany({ where: { filePath: { not: null } }, select: { filePath: true } }),
    ]);

    // Count context links per file
    const memoryCountByFile = new Map<string, number>();
    const decisionCountByFile = new Map<string, number>();

    for (const m of memories) {
        if (!m.filePath) continue;
        memoryCountByFile.set(m.filePath, (memoryCountByFile.get(m.filePath) || 0) + 1);
    }
    for (const d of decisions) {
        if (!d.filePath) continue;
        decisionCountByFile.set(d.filePath, (decisionCountByFile.get(d.filePath) || 0) + 1);
    }

    const nodes: DepNode[] = [];
    let totalLinks = 0;

    for (const file of sourceFiles) {
        const rel = relPath(file);
        const rawImports = extractImports(file);
        const resolvedImports = rawImports
            .map(imp => resolveImport(file, imp))
            .filter(Boolean)
            .map(abs => relPath(abs!));

        const linkedMem = memoryCountByFile.get(rel) || 0;
        const linkedDec = decisionCountByFile.get(rel) || 0;
        totalLinks += linkedMem + linkedDec;

        nodes.push({
            file: rel,
            imports: resolvedImports,
            linkedMemories: linkedMem,
            linkedDecisions: linkedDec,
            staleRisk: false, // filled by drift detection  
        });
    }

    // Generate Mermaid diagram (top 30 files with context or imports)
    const importantNodes = nodes
        .filter(n => n.linkedMemories > 0 || n.linkedDecisions > 0 || n.imports.length > 0)
        .slice(0, 30);

    const nodeIds = new Map<string, string>();
    let idCounter = 0;
    const getId = (file: string) => {
        if (!nodeIds.has(file)) nodeIds.set(file, `F${idCounter++}`);
        return nodeIds.get(file)!;
    };

    let mermaid = 'flowchart LR\n';

    for (const n of importantNodes) {
        const id = getId(n.file);
        const label = path.basename(n.file);
        const badge = n.linkedMemories + n.linkedDecisions > 0
            ? ` (${n.linkedMemories}M/${n.linkedDecisions}D)`
            : '';
        mermaid += `  ${id}["${label}${badge}"]\n`;
    }

    const importantFileSet = new Set(importantNodes.map(n => n.file));
    for (const n of importantNodes) {
        for (const imp of n.imports) {
            if (importantFileSet.has(imp)) {
                mermaid += `  ${getId(n.file)} --> ${getId(imp)}\n`;
            }
        }
    }

    return {
        nodes,
        totalFiles: nodes.length,
        totalLinks,
        mermaid,
    };
}
