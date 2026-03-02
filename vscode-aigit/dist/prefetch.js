"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContextPrefetchCache = void 0;
exports.createCursorWatcher = createCursorWatcher;
const vscode = __importStar(require("vscode"));
const child_process_1 = require("child_process");
const path = __importStar(require("path"));
/**
 * Proactive context pre-fetch cache. Watches cursor position and
 * pre-loads aigit context for the active file so that CodeLens and
 * Hover providers can render instantly without DB round-trips.
 */
class ContextPrefetchCache {
    constructor(workspaceRoot) {
        this.cache = new Map();
        this.pendingFiles = new Set();
        this._onDidUpdate = new vscode.EventEmitter();
        this.onDidUpdate = this._onDidUpdate.event;
        this.workspaceRoot = workspaceRoot;
    }
    /**
     * Get cached context entries for a file.
     */
    getForFile(filePath) {
        const key = this.normalizeKey(filePath);
        return this.cache.get(key);
    }
    /**
     * Pre-fetch context for a file (debounced).
     */
    prefetch(filePath) {
        if (this.pendingFiles.has(filePath))
            return;
        if (this.debounceTimer)
            clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => {
            this.doFetch(filePath);
        }, 300); // 300ms debounce
    }
    /**
     * Force-fetch context for a file immediately.
     */
    async forceFetch(filePath) {
        await this.doFetch(filePath);
    }
    /**
     * Invalidate cache for a file.
     */
    invalidate(filePath) {
        this.cache.delete(this.normalizeKey(filePath));
    }
    /**
     * Clear entire cache.
     */
    clear() {
        this.cache.clear();
    }
    async doFetch(filePath) {
        const key = this.normalizeKey(filePath);
        this.pendingFiles.add(filePath);
        try {
            const result = this.queryAigitContext(filePath);
            const entries = [
                ...result.memories.map(m => ({ ...m, type: 'memory' })),
                ...result.decisions.map(d => ({ ...d, type: 'decision' })),
            ];
            this.cache.set(key, entries);
            this._onDidUpdate.fire();
        }
        catch {
            // Silently fail — context is optional
        }
        finally {
            this.pendingFiles.delete(filePath);
        }
    }
    /**
     * Query aigit CLI for context linked to a file.
     * Uses `aigit hydrate <file>` output parsing or direct DB query via CLI.
     */
    queryAigitContext(filePath) {
        try {
            // Use aigit's JSON output mode for structured data
            const relPath = path.relative(this.workspaceRoot, filePath);
            const raw = (0, child_process_1.execSync)(`node "${path.join(this.workspaceRoot, 'node_modules/.bin/aigit')}" hydrate "${relPath}" --json 2>/dev/null || echo '{"memories":[],"decisions":[]}'`, {
                cwd: this.workspaceRoot,
                encoding: 'utf-8',
                timeout: 5000,
                stdio: ['pipe', 'pipe', 'pipe'],
            });
            // Try parsing as JSON first
            try {
                const parsed = JSON.parse(raw.trim());
                return {
                    memories: (parsed.memories || []).map((m) => ({
                        id: m.id || '',
                        type: 'memory',
                        content: m.content || '',
                        filePath: m.filePath || null,
                        lineNumber: m.lineNumber || null,
                        symbolName: m.symbolName || null,
                        symbolType: m.symbolType || null,
                        createdAt: m.createdAt || null,
                    })),
                    decisions: (parsed.decisions || []).map((d) => ({
                        id: d.id || '',
                        type: 'decision',
                        content: d.context || '',
                        filePath: d.filePath || null,
                        lineNumber: d.lineNumber || null,
                        symbolName: d.symbolName || null,
                        symbolType: d.symbolType || null,
                        chosen: d.chosen || null,
                        reasoning: d.reasoning || null,
                        createdAt: d.createdAt || null,
                    })),
                };
            }
            catch {
                // Fallback: parse text output
                return this.parseTextOutput(raw, filePath);
            }
        }
        catch {
            return { memories: [], decisions: [] };
        }
    }
    /**
     * Fallback text parser for non-JSON aigit output.
     */
    parseTextOutput(text, filePath) {
        const memories = [];
        const decisions = [];
        const lines = text.split('\n');
        for (const line of lines) {
            const trimmed = line.trim();
            // Match patterns like: 🧠 [MEMORY] pattern: Switched to Redis @initRedisClient
            const memMatch = trimmed.match(/\[MEMORY\]\s+(\w+):\s+(.+?)(?:\s+@(\w+))?$/);
            if (memMatch) {
                memories.push({
                    id: `text-${memories.length}`,
                    type: 'memory',
                    content: memMatch[2],
                    filePath,
                    lineNumber: null,
                    symbolName: memMatch[3] || null,
                    symbolType: null,
                });
                continue;
            }
            // Match patterns like: 🧭 [DECISION] Why Redis? → Redis chosen
            const decMatch = trimmed.match(/\[DECISION\]\s+(.+?)\s+→\s+(.+?)(?:\s+\((.+?)\))?$/);
            if (decMatch) {
                decisions.push({
                    id: `text-${decisions.length}`,
                    type: 'decision',
                    content: decMatch[1],
                    filePath,
                    lineNumber: null,
                    symbolName: null,
                    symbolType: null,
                    chosen: decMatch[2],
                    reasoning: decMatch[3] || undefined,
                });
            }
        }
        return { memories, decisions };
    }
    normalizeKey(filePath) {
        return path.normalize(filePath).toLowerCase();
    }
    dispose() {
        if (this.debounceTimer)
            clearTimeout(this.debounceTimer);
        this.cache.clear();
        this._onDidUpdate.dispose();
    }
}
exports.ContextPrefetchCache = ContextPrefetchCache;
/**
 * Creates and returns a cursor watcher that triggers prefetch
 * when the user changes their active editor or cursor position.
 */
function createCursorWatcher(cache) {
    const disposables = [];
    // Prefetch when active editor changes
    disposables.push(vscode.window.onDidChangeActiveTextEditor(editor => {
        if (editor && editor.document.uri.scheme === 'file') {
            cache.prefetch(editor.document.uri.fsPath);
        }
    }));
    // Prefetch on cursor movement (debounced internally by cache)
    disposables.push(vscode.window.onDidChangeTextEditorSelection(event => {
        if (event.textEditor.document.uri.scheme === 'file') {
            cache.prefetch(event.textEditor.document.uri.fsPath);
        }
    }));
    // Invalidate when file is saved (context might have changed)
    disposables.push(vscode.workspace.onDidSaveTextDocument(doc => {
        if (doc.uri.scheme === 'file') {
            cache.invalidate(doc.uri.fsPath);
            cache.prefetch(doc.uri.fsPath);
        }
    }));
    // Pre-fetch the initially active file
    if (vscode.window.activeTextEditor?.document.uri.scheme === 'file') {
        cache.prefetch(vscode.window.activeTextEditor.document.uri.fsPath);
    }
    return disposables;
}
//# sourceMappingURL=prefetch.js.map