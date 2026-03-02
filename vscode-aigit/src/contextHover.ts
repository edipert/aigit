import * as vscode from 'vscode';
import { ContextPrefetchCache, CachedSymbolContext } from './prefetch';

/**
 * HoverProvider that shows aigit context when hovering over code
 * that has linked memories or decisions.
 */
export class AigitContextHoverProvider implements vscode.HoverProvider {
    constructor(private cache: ContextPrefetchCache) { }

    provideHover(
        document: vscode.TextDocument,
        position: vscode.Position,
    ): vscode.Hover | null {
        const entries = this.cache.getForFile(document.uri.fsPath);
        if (!entries || entries.length === 0) return null;

        // Find entries near the cursor line (±2 lines tolerance)
        const line = position.line + 1; // 1-indexed
        const nearby = entries.filter((e: CachedSymbolContext) =>
            e.lineNumber && Math.abs(e.lineNumber - line) <= 2
        );

        if (nearby.length === 0) return null;

        const md = new vscode.MarkdownString('', true);
        md.isTrusted = true;
        md.supportHtml = true;

        md.appendMarkdown('### ⚓ aigit — Linked Context\n\n');

        for (const entry of nearby) {
            const icon = entry.type === 'decision' ? '🧭' : '🧠';
            const symbol = entry.symbolName ? ` \`@${entry.symbolName}\`` : '';
            const date = entry.createdAt
                ? new Date(entry.createdAt).toLocaleDateString()
                : '';

            md.appendMarkdown(`${icon} **${entry.type.toUpperCase()}**${symbol}`);
            if (date) md.appendMarkdown(` — ${date}`);
            md.appendMarkdown('\n\n');

            if (entry.type === 'decision') {
                md.appendMarkdown(`> **Context:** ${entry.content}\n\n`);
                if (entry.chosen) md.appendMarkdown(`> ✅ **Chosen:** ${entry.chosen}\n\n`);
                if (entry.reasoning) md.appendMarkdown(`> 💡 **Why:** ${entry.reasoning}\n\n`);
            } else {
                md.appendMarkdown(`> ${entry.content}\n\n`);
            }

            md.appendMarkdown('---\n\n');
        }

        return new vscode.Hover(md);
    }
}
