"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseTestOutput = parseTestOutput;
exports.extractFailedSymbols = extractFailedSymbols;
exports.queryHealingContext = queryHealingContext;
exports.diagnoseTestFailure = diagnoseTestFailure;
const path_1 = __importDefault(require("path"));
const db_1 = require("../db");
const resolver_1 = require("../ast/resolver");
/**
 * Parse raw test runner output (stdout + stderr) into structured failures.
 * Supports Jest, Vitest, Mocha, and generic Node.js stack traces.
 */
function parseTestOutput(raw) {
    const failures = [];
    // Pattern 1: Jest / Vitest — "FAIL src/foo.test.ts"
    const jestBlockRegex = /FAIL\s+(\S+\.(?:test|spec)\.\w+)/g;
    const jestBlocks = [...raw.matchAll(jestBlockRegex)];
    // Pattern 2: Generic stack trace lines — "at Object.<anonymous> (/path/to/file.ts:42:10)"
    const stackLineRegex = /at\s+(?:[\w.]+\s+)?\(?(\/[^:]+):(\d+):\d+\)?/g;
    const stackLines = [...raw.matchAll(stackLineRegex)];
    // Pattern 3: Error messages — "Error: expected X to equal Y"
    const errorMsgRegex = /(?:Error|AssertionError|TypeError|ReferenceError|RangeError):\s*(.+)/g;
    const errors = [...raw.matchAll(errorMsgRegex)];
    // Pattern 4: Test name patterns — "✕ should do something" or "✗ test name" or "FAIL test name"
    const testNameRegex = /(?:✕|✗|×|FAIL)\s+(.+?)(?:\s*\(\d+\s*ms\))?$/gm;
    const testNames = [...raw.matchAll(testNameRegex)];
    // Build failures from stack traces (most reliable)
    const seenFiles = new Set();
    for (const match of stackLines) {
        const filePath = match[1];
        const lineNumber = parseInt(match[2], 10);
        const fileKey = `${filePath}:${lineNumber}`;
        if (seenFiles.has(fileKey))
            continue;
        seenFiles.add(fileKey);
        // Find the closest error message
        const errorIndex = raw.lastIndexOf(match[0]);
        let errorMessage = 'Unknown error';
        for (const err of errors) {
            const errIndex = raw.indexOf(err[0]);
            if (errIndex < errorIndex) {
                errorMessage = err[1].trim();
            }
        }
        // Find relevant test name
        let testName = 'Unknown test';
        for (const tn of testNames) {
            const tnIndex = raw.indexOf(tn[0]);
            if (tnIndex < errorIndex) {
                testName = tn[1].trim();
            }
        }
        // Extract a small snippet around the stack line
        const snippetStart = Math.max(0, errorIndex - 200);
        const snippetEnd = Math.min(raw.length, errorIndex + 300);
        const stackSnippet = raw.substring(snippetStart, snippetEnd).trim();
        failures.push({ testName, filePath, lineNumber, errorMessage, stackSnippet });
    }
    // Fallback: if no stack traces found, try to extract from Jest blocks
    if (failures.length === 0) {
        for (const block of jestBlocks) {
            const filePath = block[1];
            const errorMessage = errors.length > 0 ? errors[0][1].trim() : 'Test suite failed';
            failures.push({
                testName: path_1.default.basename(filePath),
                filePath,
                lineNumber: null,
                errorMessage,
                stackSnippet: raw.substring(0, 500),
            });
        }
    }
    // Final fallback: generic error extraction
    if (failures.length === 0 && errors.length > 0) {
        for (const err of errors) {
            failures.push({
                testName: 'Unknown test',
                filePath: null,
                lineNumber: null,
                errorMessage: err[1].trim(),
                stackSnippet: raw.substring(0, 500),
            });
        }
    }
    return failures;
}
/**
 * Resolve test failures to AST symbols.
 */
function extractFailedSymbols(failures, workspacePath) {
    const symbols = [];
    const seen = new Set();
    for (const failure of failures) {
        if (!failure.filePath || !failure.lineNumber)
            continue;
        const fullPath = path_1.default.isAbsolute(failure.filePath)
            ? failure.filePath
            : path_1.default.join(workspacePath, failure.filePath);
        try {
            const resolved = (0, resolver_1.resolveSymbolAtLine)(fullPath, failure.lineNumber);
            if (resolved && !seen.has(resolved.qualifiedName)) {
                seen.add(resolved.qualifiedName);
                symbols.push({
                    name: resolved.qualifiedName,
                    type: resolved.type,
                    file: failure.filePath,
                });
            }
        }
        catch {
            // File might not be parseable, skip
        }
    }
    return symbols;
}
/**
 * Query aigit's semantic memory for context related to the broken symbols.
 */
async function queryHealingContext(symbols, branch) {
    const symbolNames = symbols.map(s => s.name);
    const filePaths = [...new Set(symbols.map(s => s.file))];
    // Query by symbol name OR file path
    const whereClause = symbolNames.length > 0
        ? { OR: [{ symbolName: { in: symbolNames } }, { filePath: { in: filePaths } }] }
        : filePaths.length > 0
            ? { filePath: { in: filePaths } }
            : {};
    const [memories, decisions] = await Promise.all([
        db_1.prisma.memory.findMany({
            where: { ...whereClause, gitBranch: branch },
            orderBy: { createdAt: 'desc' },
            take: 10,
            select: { id: true, content: true, type: true },
        }),
        db_1.prisma.decision.findMany({
            where: { ...whereClause, gitBranch: branch },
            orderBy: { createdAt: 'desc' },
            take: 10,
            select: { id: true, context: true, chosen: true },
        }),
    ]);
    return { memories, decisions };
}
/**
 * Build a complete diagnosis from raw test output.
 */
async function diagnoseTestFailure(raw, workspacePath, branch) {
    const failures = parseTestOutput(raw);
    const symbols = extractFailedSymbols(failures, workspacePath);
    const { memories, decisions } = await queryHealingContext(symbols, branch);
    // Build a human-readable summary
    const failCount = failures.length;
    const symbolList = symbols.map(s => `@${s.name}`).join(', ');
    const contextCount = memories.length + decisions.length;
    let summary = `${failCount} test failure(s) detected.`;
    if (symbols.length > 0)
        summary += ` Linked to ${symbols.length} symbol(s): ${symbolList}.`;
    if (contextCount > 0)
        summary += ` Found ${contextCount} related context entries.`;
    if (contextCount === 0)
        summary += ` No prior context found — this may be a new or untouched area.`;
    return {
        failures,
        symbols,
        relatedMemories: memories,
        relatedDecisions: decisions,
        summary,
    };
}
