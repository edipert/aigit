import * as vscode from 'vscode';
import { ContextPrefetchCache, CachedSymbolContext } from './prefetch';

/**
 * CodeLensProvider that shows inline context hints above functions/classes
 * that have linked aigit memories or decisions.
 */
export class AigitContextLensProvider implements vscode.CodeLensProvider {
    private _onDidChangeCodeLenses = new vscode.EventEmitter<void>();
    readonly onDidChangeCodeLenses = this._onDidChangeCodeLenses.event;

    constructor(private cache: ContextPrefetchCache) {
        cache.onDidUpdate(() => this._onDidChangeCodeLenses.fire());
    }

    provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
        const entries = this.cache.getForFile(document.uri.fsPath);
        if (!entries || entries.length === 0) return [];

        const lenses: vscode.CodeLens[] = [];

        for (const entry of entries) {
            if (!entry.lineNumber || entry.lineNumber < 1) continue;

            const line = Math.max(0, entry.lineNumber - 1);
            const range = new vscode.Range(line, 0, line, 0);
            const label = this.formatLabel(entry);

            lenses.push(new vscode.CodeLens(range, {
                title: label,
                command: 'aigit.showContextDetail',
                arguments: [entry],
                tooltip: entry.content,
            }));
        }

        return lenses;
    }

    private formatLabel(entry: CachedSymbolContext): string {
        const icon = entry.type === 'decision' ? '🧭' : '🧠';
        const symbol = entry.symbolName ? `@${entry.symbolName}` : '';
        const preview = entry.content.length > 50
            ? entry.content.slice(0, 47) + '...'
            : entry.content;
        return `${icon} aigit${symbol ? ` ${symbol}` : ''}: ${preview}`;
    }

    refresh() {
        this._onDidChangeCodeLenses.fire();
    }
}
