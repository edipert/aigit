"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectContextDrift = detectContextDrift;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const db_1 = require("../db");
const resolver_1 = require("../ast/resolver");
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
async function detectContextDrift(workspacePath) {
    const staleItems = [];
    // 1. Read package.json dependencies
    let activeDeps = new Set();
    try {
        const pkgStr = fs_1.default.readFileSync(path_1.default.join(workspacePath, 'package.json'), 'utf-8');
        const pkg = JSON.parse(pkgStr);
        Object.keys(pkg.dependencies || {}).forEach(d => activeDeps.add(d));
        Object.keys(pkg.devDependencies || {}).forEach(d => activeDeps.add(d));
    }
    catch {
        // No package.json found or unparseable, skip dep check
    }
    const [memories, decisions] = await Promise.all([
        db_1.prisma.memory.findMany(),
        db_1.prisma.decision.findMany()
    ]);
    // Check memories
    for (const m of memories) {
        let isStale = false;
        let reason = '';
        // Check file existence
        if (m.filePath) {
            const fullPath = path_1.default.join(workspacePath, m.filePath);
            if (!fs_1.default.existsSync(fullPath)) {
                isStale = true;
                reason = `Anchored file deleted: ${m.filePath}`;
            }
            else if (m.symbolName) {
                // File exists, check if symbol still exists
                try {
                    const symbols = (0, resolver_1.extractAllSymbols)(fullPath);
                    const found = symbols.some(s => s.qualifiedName === m.symbolName);
                    if (!found) {
                        isStale = true;
                        reason = `Anchored AST symbol deleted: ${m.symbolName} in ${m.filePath}`;
                    }
                }
                catch {
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
            const fullPath = path_1.default.join(workspacePath, d.filePath);
            if (!fs_1.default.existsSync(fullPath)) {
                isStale = true;
                reason = `Anchored file deleted: ${d.filePath}`;
            }
            else if (d.symbolName) {
                try {
                    const symbols = (0, resolver_1.extractAllSymbols)(fullPath);
                    const found = symbols.some(s => s.qualifiedName === d.symbolName);
                    if (!found) {
                        isStale = true;
                        reason = `Anchored AST symbol deleted: ${d.symbolName} in ${d.filePath}`;
                    }
                }
                catch { }
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
