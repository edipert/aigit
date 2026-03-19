import * as vscode from 'vscode';
import { TimelineProvider } from './timelineProvider';
import { SyncProvider } from './syncProvider';
import { SyncStatusBar } from './statusBar';
import { AigitContextLensProvider } from './contextLens';
import { AigitContextHoverProvider } from './contextHover';
import { CachedSymbolContext, ContextPrefetchCache, createCursorWatcher } from './prefetch';

export function activate(context: vscode.ExtensionContext) {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) { return; }

    // --- Providers ---
    const timelineProvider = new TimelineProvider(context.extensionUri, workspaceRoot);
    const syncProvider = new SyncProvider(context.extensionUri, workspaceRoot);
    const statusBar = new SyncStatusBar();

    // Phase 25: Proactive Context Pre-fetching
    const prefetchCache = new ContextPrefetchCache(workspaceRoot);
    const contextLens = new AigitContextLensProvider(prefetchCache);
    const contextHover = new AigitContextHoverProvider(prefetchCache);

    // Register language-agnostic CodeLens and Hover providers
    const allLanguages = { scheme: 'file' };
    context.subscriptions.push(
        vscode.languages.registerCodeLensProvider(allLanguages, contextLens),
        vscode.languages.registerHoverProvider(allLanguages, contextHover),
        ...createCursorWatcher(prefetchCache),
        { dispose: () => prefetchCache.dispose() },
    );

    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider('aigit.timelineView', timelineProvider),
        vscode.window.registerWebviewViewProvider('aigit.syncView', syncProvider),
        { dispose: () => statusBar.dispose() }
    );

    // Helper: refresh sync dashboard + status bar
    function refreshSync() {
        syncProvider.refresh();
        const s = syncProvider.getStatus();
        statusBar.update(s.tools.length, s.pendingSections, s.conflictCount);
    }

    // --- Timeline Commands ---
    context.subscriptions.push(
        vscode.commands.registerCommand('aigit.showTimeline', () => {
            timelineProvider.refresh();
            vscode.window.showInformationMessage('Aigit: Timeline refreshed.');
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('aigit.commitMemory', async () => {
            const summary = await vscode.window.showInputBox({
                prompt: 'Enter a semantic summary of your architectural changes',
                placeHolder: 'e.g. Refactored the authentication flow to use JWTs instead of sessions'
            });

            if (summary) {
                const terminal = getOrCreateTerminal();
                terminal.sendText(`aigit commit memory "${summary}"`);
                terminal.show();
                // Refresh the timeline after a short delay so the new memory appears
                setTimeout(() => timelineProvider.refresh(), 2000);
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('aigit.hydrate', () => {
            const terminal = getOrCreateTerminal();
            terminal.sendText('aigit hydrate');
            terminal.show();
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('aigit.revert', async () => {
            const id = await vscode.window.showInputBox({
                prompt: 'Enter the UUID of the context entry to revert',
                placeHolder: 'e.g. a1b2c3d4-...'
            });
            if (id) {
                const terminal = getOrCreateTerminal();
                terminal.sendText(`aigit revert ${id}`);
                terminal.show();
                setTimeout(() => timelineProvider.refresh(), 2000);
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('aigit.dump', () => {
            const terminal = getOrCreateTerminal();
            terminal.sendText('aigit dump');
            terminal.show();
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('aigit.load', () => {
            const terminal = getOrCreateTerminal();
            terminal.sendText('aigit load');
            terminal.show();
        })
    );

    // --- Phase 25: Context detail command (triggered from CodeLens) ---
    context.subscriptions.push(
        vscode.commands.registerCommand('aigit.showContextDetail', (entry: CachedSymbolContext) => {
            const panel = vscode.window.createWebviewPanel(
                'aigitContext', `⚓ aigit: ${entry.symbolName || 'Context'}`,
                vscode.ViewColumn.Beside, { enableScripts: false }
            );
            const icon = entry.type === 'decision' ? '🧭' : '🧠';
            panel.webview.html = `
                <html><body style="font-family: var(--vscode-font-family); padding: 16px; color: var(--vscode-foreground); background: var(--vscode-editor-background);">
                    <h2>${icon} ${entry.type.toUpperCase()}</h2>
                    ${entry.symbolName ? `<p><strong>Symbol:</strong> <code>@${entry.symbolName}</code> (${entry.symbolType || 'unknown'})</p>` : ''}
                    ${entry.filePath ? `<p><strong>File:</strong> <code>${entry.filePath}</code></p>` : ''}
                    <hr/>
                    <p><strong>Content:</strong></p>
                    <blockquote>${entry.content}</blockquote>
                    ${entry.chosen ? `<p>✅ <strong>Chosen:</strong> ${entry.chosen}</p>` : ''}
                    ${entry.reasoning ? `<p>💡 <strong>Reasoning:</strong> ${entry.reasoning}</p>` : ''}
                    ${entry.createdAt ? `<p style="opacity:0.6;margin-top:16px;font-size:12px;">Created: ${entry.createdAt}</p>` : ''}
                </body></html>`;
        })
    );

    // --- Phase 24: Query command ---
    context.subscriptions.push(
        vscode.commands.registerCommand('aigit.query', async () => {
            const query = await vscode.window.showInputBox({
                prompt: 'What do you want to know about this project?',
                placeHolder: 'e.g. "Why did we choose Redis?"'
            });
            if (query) {
                const terminal = getOrCreateTerminal();
                terminal.sendText(`aigit query "${query}"`);
                terminal.show();
            }
        })
    );

    // --- Swarm Commands ---
    context.subscriptions.push(
        vscode.commands.registerCommand('aigit.swarmStatus', () => {
            const terminal = getOrCreateTerminal();
            terminal.sendText('aigit swarm status');
            terminal.show();
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('aigit.swarmConflicts', () => {
            const terminal = getOrCreateTerminal();
            terminal.sendText('aigit swarm conflicts');
            terminal.show();
        })
    );

    // --- Self-Healing Commands ---
    context.subscriptions.push(
        vscode.commands.registerCommand('aigit.heal', () => {
            const terminal = getOrCreateTerminal();
            terminal.sendText('aigit heal');
            terminal.show();
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('aigit.healStatus', () => {
            const terminal = getOrCreateTerminal();
            terminal.sendText('aigit heal status');
            terminal.show();
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('aigit.deps', () => {
            const terminal = getOrCreateTerminal();
            terminal.sendText('aigit deps');
            terminal.show();
        })
    );

    // --- Documentation Commands ---
    context.subscriptions.push(
        vscode.commands.registerCommand('aigit.docs', () => {
            const terminal = getOrCreateTerminal();
            terminal.sendText('aigit docs');
            terminal.show();
        })
    );

    // --- Agent Sync Commands ---
    context.subscriptions.push(
        vscode.commands.registerCommand('aigit.scan', () => {
            refreshSync();
            vscode.window.showInformationMessage(
                `Aigit: Found ${syncProvider.getStatus().tools.length} AI tool(s).`
            );
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('aigit.sync', () => {
            const terminal = getOrCreateTerminal();
            terminal.sendText('aigit sync');
            terminal.show();
            setTimeout(() => refreshSync(), 3000);
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('aigit.syncDryRun', () => {
            const terminal = getOrCreateTerminal();
            terminal.sendText('aigit sync --dry-run');
            terminal.show();
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('aigit.showConflicts', () => {
            const conflictsPath = vscode.Uri.file(`${workspaceRoot}/.aigit/conflicts.json`);
            const status = syncProvider.getStatus();
            if (status.conflictCount > 0) {
                vscode.window.showTextDocument(conflictsPath);
            } else {
                vscode.window.showInformationMessage('Aigit: No conflicts detected. All tools are in sync.');
            }
        })
    );

    // --- Auto-refresh on editor change ---
    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor(() => {
            timelineProvider.refresh();
        })
    );

    // --- File watcher: auto-rescan on agent config changes ---
    const watchPattern = new vscode.RelativePattern(workspaceRoot,
        '{.cursorrules,.clinerules,.windsurfrules,CLAUDE.md,AGENTS.md,GEMINI.md,CODEX.md,.github/copilot-instructions.md,CONVENTIONS.md}'
    );
    const watcher = vscode.workspace.createFileSystemWatcher(watchPattern);

    watcher.onDidChange(() => refreshSync());
    watcher.onDidCreate(() => refreshSync());
    watcher.onDidDelete(() => refreshSync());

    context.subscriptions.push(watcher);

    // Initial scan on activation
    refreshSync();
}

function getOrCreateTerminal(): vscode.Terminal {
    const existing = vscode.window.terminals.find(t => t.name === 'aigit');
    if (existing) { return existing; }
    return vscode.window.createTerminal('aigit');
}

export function deactivate() { }

