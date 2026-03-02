"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractAllSymbols = extractAllSymbols;
exports.resolveSymbolAtLine = resolveSymbolAtLine;
exports.formatRange = formatRange;
exports.findLinkedContext = findLinkedContext;
exports.anchorFileToSymbols = anchorFileToSymbols;
const path_1 = __importDefault(require("path"));
const extractor_1 = require("./extractor");
const fallback_1 = require("./fallback");
const db_1 = require("../db");
const TS_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mts', '.mjs']);
/**
 * Extract all symbols from a file, using ts-morph for TS/JS and regex for others.
 */
function extractAllSymbols(filePath) {
    const ext = path_1.default.extname(filePath).toLowerCase();
    if (TS_EXTENSIONS.has(ext)) {
        return (0, extractor_1.extractSymbols)(filePath);
    }
    return (0, fallback_1.extractSymbolsFallback)(filePath);
}
/**
 * Resolve which symbol encloses a given line in a file.
 */
function resolveSymbolAtLine(filePath, line) {
    const ext = path_1.default.extname(filePath).toLowerCase();
    if (TS_EXTENSIONS.has(ext)) {
        return (0, extractor_1.findEnclosingSymbol)(filePath, line);
    }
    // Fallback: find from regex-extracted symbols
    const symbols = (0, fallback_1.extractSymbolsFallback)(filePath);
    let best = null;
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
function formatRange(range) {
    return `${range.startLine}:${range.startCol}-${range.endLine}:${range.endCol}`;
}
/**
 * Find all memories and decisions linked to a symbol name in a file.
 */
async function findLinkedContext(symbolName, filePath) {
    const where = { symbolName };
    if (filePath) {
        const relPath = filePath.includes('/') ? filePath : filePath;
        where.filePath = { contains: relPath };
    }
    const [memories, decisions] = await Promise.all([
        db_1.prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' }, take: 20 }),
        db_1.prisma.decision.findMany({ where, orderBy: { createdAt: 'desc' }, take: 20 }),
    ]);
    return { memories, decisions };
}
/**
 * Retroactively anchor existing memories/decisions to symbols.
 * For each memory/decision with a filePath + lineNumber but no symbolName,
 * resolve the enclosing symbol and bind it.
 */
async function anchorFileToSymbols(filePath, workspacePath) {
    const relPath = path_1.default.relative(workspacePath, filePath);
    const symbols = extractAllSymbols(filePath);
    if (symbols.length === 0) {
        return { anchored: 0, total: 0 };
    }
    // Find unanchored entries for this file
    const [memories, decisions] = await Promise.all([
        db_1.prisma.memory.findMany({
            where: { filePath: { contains: relPath }, symbolName: null },
        }),
        db_1.prisma.decision.findMany({
            where: { filePath: { contains: relPath }, symbolName: null },
        }),
    ]);
    let anchored = 0;
    const total = memories.length + decisions.length;
    for (const m of memories) {
        if (!m.lineNumber)
            continue;
        const sym = findSymbolForLine(symbols, m.lineNumber);
        if (sym) {
            await db_1.prisma.memory.update({
                where: { id: m.id },
                data: {
                    symbolName: sym.qualifiedName,
                    symbolType: sym.type,
                    symbolRange: formatRange(sym.range),
                },
            });
            anchored++;
        }
    }
    for (const d of decisions) {
        if (!d.lineNumber)
            continue;
        const sym = findSymbolForLine(symbols, d.lineNumber);
        if (sym) {
            await db_1.prisma.decision.update({
                where: { id: d.id },
                data: {
                    symbolName: sym.qualifiedName,
                    symbolType: sym.type,
                    symbolRange: formatRange(sym.range),
                },
            });
            anchored++;
        }
    }
    return { anchored, total };
}
function findSymbolForLine(symbols, line) {
    let best = null;
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
