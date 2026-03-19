import path from 'path';
import { extractSymbols, findEnclosingSymbol, type CodeSymbol } from './extractor';
import { extractSymbolsFallback } from './fallback';
import { prisma } from '../db';

const TS_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mts', '.mjs']);

/**
 * Extract all symbols from a file, using ts-morph for TS/JS and regex for others.
 */
export function extractAllSymbols(filePath: string): CodeSymbol[] {
    const ext = path.extname(filePath).toLowerCase();
    if (TS_EXTENSIONS.has(ext)) {
        return extractSymbols(filePath);
    }
    return extractSymbolsFallback(filePath);
}

/**
 * Resolve which symbol encloses a given line in a file.
 */
export function resolveSymbolAtLine(filePath: string, line: number): CodeSymbol | null {
    const ext = path.extname(filePath).toLowerCase();

    if (TS_EXTENSIONS.has(ext)) {
        return findEnclosingSymbol(filePath, line);
    }

    // Fallback: find from regex-extracted symbols
    const symbols = extractSymbolsFallback(filePath);
    let best: CodeSymbol | null = null;
    let bestSpan = Infinity;

    for (const sym of symbols) {
        if (line >= sym.range.startLine && line <= sym.range.endLine) {
            const span = sym.range.endLine - sym.range.startLine;
            if (span < bestSpan) {
                bestSpan = span;
                best = sym;
            }
        }
    }
    return best;
}

/**
 * Format a symbol range as a compact string.
 */
export function formatRange(range: CodeSymbol['range']): string {
    return `${range.startLine}:${range.startCol}-${range.endLine}:${range.endCol}`;
}

/**
 * Find all memories and decisions linked to a symbol name in a file.
 */
export async function findLinkedContext(symbolName: string, filePath?: string) {
    const where: Record<string, unknown> = { symbolName };
    if (filePath) {
        const relPath = filePath.includes('/') ? filePath : filePath;
        where.filePath = { contains: relPath };
    }

    const [memories, decisions] = await Promise.all([
        prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' }, take: 20 }),
        prisma.decision.findMany({ where, orderBy: { createdAt: 'desc' }, take: 20 }),
    ]);

    return { memories, decisions };
}

/**
 * Retroactively anchor existing memories/decisions to symbols.
 * For each memory/decision with a filePath + lineNumber but no symbolName,
 * resolve the enclosing symbol and bind it.
 */
export async function anchorFileToSymbols(filePath: string, workspacePath: string) {
    const relPath = path.relative(workspacePath, filePath);
    const symbols = extractAllSymbols(filePath);

    if (symbols.length === 0) {
        return { anchored: 0, total: 0 };
    }

    // Find unanchored entries for this file
    const [memories, decisions] = await Promise.all([
        prisma.memory.findMany({
            where: { filePath: { contains: relPath }, symbolName: null },
        }),
        prisma.decision.findMany({
            where: { filePath: { contains: relPath }, symbolName: null },
        }),
    ]);

    let anchored = 0;
    const total = memories.length + decisions.length;

    const updatePromises = [];

    for (const m of memories) {
        if (!m.lineNumber) continue;
        const sym = findSymbolForLine(symbols, m.lineNumber);
        if (sym) {
            updatePromises.push(
                prisma.memory.update({
                    where: { id: m.id },
                    data: {
                        symbolName: sym.qualifiedName,
                        symbolType: sym.type,
                        symbolRange: formatRange(sym.range),
                    },
                })
            );
            anchored++;
        }
    }

    for (const d of decisions) {
        if (!d.lineNumber) continue;
        const sym = findSymbolForLine(symbols, d.lineNumber);
        if (sym) {
            updatePromises.push(
                prisma.decision.update({
                    where: { id: d.id },
                    data: {
                        symbolName: sym.qualifiedName,
                        symbolType: sym.type,
                        symbolRange: formatRange(sym.range),
                    },
                })
            );
            anchored++;
        }
    }

    if (updatePromises.length > 0) {
        await prisma.$transaction(updatePromises);
    }

    return { anchored, total };
}

function findSymbolForLine(symbols: CodeSymbol[], line: number): CodeSymbol | null {
    let best: CodeSymbol | null = null;
    let bestSpan = Infinity;

    for (const sym of symbols) {
        if (line >= sym.range.startLine && line <= sym.range.endLine) {
            const span = sym.range.endLine - sym.range.startLine;
            if (span < bestSpan) {
                bestSpan = span;
                best = sym;
            }
        }
    }
    return best;
}
