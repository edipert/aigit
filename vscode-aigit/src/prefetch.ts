import * as vscode from 'vscode';
import { execSync } from 'child_process';
import * as path from 'path';

export interface CachedSymbolContext {
    id: string;
    type: 'memory' | 'decision';
    content: string;
    filePath: string | null;
    lineNumber: number | null;
    symbolName: string | null;
    symbolType: string | null;
    chosen?: string;
    reasoning?: string;
    createdAt?: string;
}

interface AigitRawMemory {
    id?: string;
    content?: string;
    filePath?: string;
    lineNumber?: number;
    symbolName?: string;
    symbolType?: string;
    createdAt?: string;
}

interface AigitRawDecision {
    id?: string;
    context?: string;
    filePath?: string;
    lineNumber?: number;
    symbolName?: string;
    symbolType?: string;
    chosen?: string;
    reasoning?: string;
    createdAt?: string;
}

interface PrefetchResult {
    memories: CachedSymbolContext[];
    decisions: CachedSymbolContext[];
}

interface AigitRawMemory {
    id?: string;
    content?: string;
    filePath?: string;
    lineNumber?: number;
    symbolName?: string;
    symbolType?: string;
    createdAt?: string;
}

interface AigitRawDecision {
    id?: string;
    context?: string;
    filePath?: string;
    lineNumber?: number;
    symbolName?: string;
    symbolType?: string;
    chosen?: string;
    reasoning?: string;
    createdAt?: string;
}

/**
 * Proactive context pre-fetch cache. Watches cursor position and
 * pre-loads aigit context for the active file so that CodeLens and
 * Hover providers can render instantly without DB round-trips.
 */
export class ContextPrefetchCache {
    private cache = new Map<string, CachedSymbolContext[]>();
    private pendingFiles = new Set<string>();
    private _onDidUpdate = new vscode.EventEmitter<void>();
    readonly onDidUpdate = this._onDidUpdate.event;
    private debounceTimer: NodeJS.Timeout | undefined;
    private workspaceRoot: string;

    constructor(workspaceRoot: string) {
        this.workspaceRoot = workspaceRoot;
    }

    /**
     * Get cached context entries for a file.
     */
    getForFile(filePath: string): CachedSymbolContext[] | undefined {
        const key = this.normalizeKey(filePath);
        return this.cache.get(key);
    }

    /**
     * Pre-fetch context for a file (debounced).
     */
    prefetch(filePath: string) {
        if (this.pendingFiles.has(filePath)) return;

        if (this.debounceTimer) clearTimeout(this.debounceTimer);

        this.debounceTimer = setTimeout(() => {
            this.doFetch(filePath);
        }, 300); // 300ms debounce
    }

    /**
     * Force-fetch context for a file immediately.
     */
    async forceFetch(filePath: string) {
        await this.doFetch(filePath);
    }

    /**
     * Invalidate cache for a file.
     */
    invalidate(filePath: string) {
        this.cache.delete(this.normalizeKey(filePath));
    }

    /**
     * Clear entire cache.
     */
    clear() {
        this.cache.clear();
    }

    private async doFetch(filePath: string) {
        const key = this.normalizeKey(filePath);
        this.pendingFiles.add(filePath);

        try {
            const result = this.queryAigitContext(filePath);
            const entries = [
                ...result.memories.map(m => ({ ...m, type: 'memory' as const })),
                ...result.decisions.map(d => ({ ...d, type: 'decision' as const })),
            ];

            this.cache.set(key, entries);
            this._onDidUpdate.fire();
        } catch {
            // Silently fail — context is optional
        } finally {
            this.pendingFiles.delete(filePath);
        }
    }

    /**
     * Query aigit CLI for context linked to a file.
     * Uses `aigit hydrate <file>` output parsing or direct DB query via CLI.
     */
    private queryAigitContext(filePath: string): PrefetchResult {
        try {
            // Use aigit's JSON output mode for structured data
            const relPath = path.relative(this.workspaceRoot, filePath);
            const raw = execSync(
                `node "${path.join(this.workspaceRoot, 'node_modules/.bin/aigit')}" hydrate "${relPath}" --json 2>/dev/null || echo '{"memories":[],"decisions":[]}'`,
                {
                    cwd: this.workspaceRoot,
                    encoding: 'utf-8',
                    timeout: 5000,
                    stdio: ['pipe', 'pipe', 'pipe'],
                }
            );

            // Try parsing as JSON first
            try {
                const parsed = JSON.parse(raw.trim());
                return {
                    memories: (parsed.memories || []).map((m: AigitRawMemory) => ({
                        id: m.id || '',
                        type: 'memory',
                        content: m.content || '',
                        filePath: m.filePath || null,
                        lineNumber: m.lineNumber || null,
                        symbolName: m.symbolName || null,
                        symbolType: m.symbolType || null,
                        createdAt: m.createdAt || null,
                    })),
                    decisions: (parsed.decisions || []).map((d: AigitRawDecision) => ({
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
            } catch {
                // Fallback: parse text output
                return this.parseTextOutput(raw, filePath);
            }
        } catch {
            return { memories: [], decisions: [] };
        }
    }

    /**
     * Fallback text parser for non-JSON aigit output.
     */
    private parseTextOutput(text: string, filePath: string): PrefetchResult {
        const memories: CachedSymbolContext[] = [];
        const decisions: CachedSymbolContext[] = [];

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

    private normalizeKey(filePath: string): string {
        return path.normalize(filePath).toLowerCase();
    }

    dispose() {
        if (this.debounceTimer) clearTimeout(this.debounceTimer);
        this.cache.clear();
        this._onDidUpdate.dispose();
    }
}

/**
 * Creates and returns a cursor watcher that triggers prefetch
 * when the user changes their active editor or cursor position.
 */
export function createCursorWatcher(
    cache: ContextPrefetchCache,
): vscode.Disposable[] {
    const disposables: vscode.Disposable[] = [];

    // Prefetch when active editor changes
    disposables.push(
        vscode.window.onDidChangeActiveTextEditor(editor => {
            if (editor && editor.document.uri.scheme === 'file') {
                cache.prefetch(editor.document.uri.fsPath);
            }
        })
    );

    // Prefetch on cursor movement (debounced internally by cache)
    disposables.push(
        vscode.window.onDidChangeTextEditorSelection(event => {
            if (event.textEditor.document.uri.scheme === 'file') {
                cache.prefetch(event.textEditor.document.uri.fsPath);
            }
        })
    );

    // Invalidate when file is saved (context might have changed)
    disposables.push(
        vscode.workspace.onDidSaveTextDocument(doc => {
            if (doc.uri.scheme === 'file') {
                cache.invalidate(doc.uri.fsPath);
                cache.prefetch(doc.uri.fsPath);
            }
        })
    );

    // Pre-fetch the initially active file
    if (vscode.window.activeTextEditor?.document.uri.scheme === 'file') {
        cache.prefetch(vscode.window.activeTextEditor.document.uri.fsPath);
    }

    return disposables;
}
