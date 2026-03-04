import fs from 'fs';
import path from 'path';
import { prisma } from '../db';
import { extractAllSymbols } from '../ast/resolver';

export interface StaleContext {
    id: string;
    type: 'memory' | 'decision';
    reason: string;
    contentPreview: string;
}

export interface DriftReport {
    staleCount: number;
    staleItems: StaleContext[];
}

/**
 * Common popular libraries that often dictate architectural decisions.
 * We scan memory text for these, and if found, verify they still exist in package.json.
 */
const KNOWN_LIBS = [
    'redis', 'framer-motion', 'prisma', 'mongoose', 'express', 'fastify', 'react-router',
    'graphql', 'apollo', 'tailwindcss', 'styled-components', 'zod', 'yup', 'axios', 'trpc'
];

/**
 * Detect semantic memories that reference deleted files, removed AST symbols,
 * or uninstalled npm packages.
 */
export async function detectContextDrift(workspacePath: string): Promise<DriftReport> {
    const staleItems: StaleContext[] = [];

    // 1. Read package.json dependencies
    let activeDeps = new Set<string>();
    try {
        const pkgStr = fs.readFileSync(path.join(workspacePath, 'package.json'), 'utf-8');
        const pkg = JSON.parse(pkgStr);
        Object.keys(pkg.dependencies || {}).forEach(d => activeDeps.add(d));
        Object.keys(pkg.devDependencies || {}).forEach(d => activeDeps.add(d));
    } catch {
        // No package.json found or unparseable, skip dep check
    }

    const [memories, decisions] = await Promise.all([
        prisma.memory.findMany(),
        prisma.decision.findMany()
    ]);

    // Check memories
    for (const m of memories) {
        let isStale = false;
        let reason = '';

        // Check file existence
        if (m.filePath) {
            const fullPath = path.join(workspacePath, m.filePath);
            if (!fs.existsSync(fullPath)) {
                isStale = true;
                reason = `Anchored file deleted: ${m.filePath}`;
            } else if (m.symbolName) {
                // File exists, check if symbol still exists
                try {
                    const symbols = extractAllSymbols(fullPath);
                    const found = symbols.some(s => s.qualifiedName === m.symbolName);
                    if (!found) {
                        isStale = true;
                        reason = `Anchored AST symbol deleted: ${m.symbolName} in ${m.filePath}`;
                    }
                } catch {
                    // AST parse error, skip symbol check
                }
            }
        }

        // Check package.json drift
        if (!isStale && m.type === 'architecture') {
            const contentLower = m.content.toLowerCase();
            for (const lib of KNOWN_LIBS) {
                if (contentLower.includes(lib) && !activeDeps.has(lib)) {
                    isStale = true;
                    reason = `Dependency removed: Memory references '${lib}' but it is no longer in package.json`;
                    break;
                }
            }
        }

        if (isStale && !m.content.includes('[OBSOLETE]')) {
            staleItems.push({
                id: m.id,
                type: 'memory',
                reason,
                contentPreview: m.content.substring(0, 60) + '...'
            });
        }
    }

    // Check decisions
    for (const d of decisions) {
        let isStale = false;
        let reason = '';

        if (d.filePath) {
            const fullPath = path.join(workspacePath, d.filePath);
            if (!fs.existsSync(fullPath)) {
                isStale = true;
                reason = `Anchored file deleted: ${d.filePath}`;
            } else if (d.symbolName) {
                try {
                    const symbols = extractAllSymbols(fullPath);
                    const found = symbols.some(s => s.qualifiedName === d.symbolName);
                    if (!found) {
                        isStale = true;
                        reason = `Anchored AST symbol deleted: ${d.symbolName} in ${d.filePath}`;
                    }
                } catch { }
            }
        }

        if (!isStale) {
            const contentLower = (d.context + ' ' + d.chosen + ' ' + d.reasoning).toLowerCase();
            for (const lib of KNOWN_LIBS) {
                if (contentLower.includes(lib) && !activeDeps.has(lib)) {
                    isStale = true;
                    reason = `Dependency removed: Decision references '${lib}' but it is no longer in package.json`;
                    break;
                }
            }
        }

        if (isStale && !d.chosen.includes('[OBSOLETE]')) {
            staleItems.push({
                id: d.id,
                type: 'decision',
                reason,
                contentPreview: `${d.context} -> ${d.chosen}`.substring(0, 60) + '...'
            });
        }
    }

    return {
        staleCount: staleItems.length,
        staleItems
    };
}
