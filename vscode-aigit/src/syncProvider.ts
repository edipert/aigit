import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as cp from 'child_process';

interface DetectedTool {
    id: string;
    name: string;
    files: string[];
}

interface SyncStatus {
    tools: DetectedTool[];
    pendingSections: number;
    conflictCount: number;
}

export class SyncProvider implements vscode.WebviewViewProvider {
    private _view?: vscode.WebviewView;
    private _status: SyncStatus = { tools: [], pendingSections: 0, conflictCount: 0 };

    constructor(
        private readonly extensionUri: vscode.Uri,
        private readonly workspaceRoot: string
    ) { }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        _context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ) {
        this._view = webviewView;
        webviewView.webview.options = { enableScripts: true };

        webviewView.webview.onDidReceiveMessage(msg => {
            switch (msg.command) {
                case 'aigit.scan': vscode.commands.executeCommand('aigit.scan'); break;
                case 'aigit.sync': vscode.commands.executeCommand('aigit.sync'); break;
                case 'aigit.syncDryRun': vscode.commands.executeCommand('aigit.syncDryRun'); break;
                case 'aigit.syncSkills': vscode.commands.executeCommand('aigit.syncSkills'); break;
                case 'aigit.showConflicts': vscode.commands.executeCommand('aigit.showConflicts'); break;
                case 'openFile':
                    if (msg.file) {
                        const uri = vscode.Uri.file(path.join(this.workspaceRoot, msg.file));
                        vscode.window.showTextDocument(uri);
                    }
                    break;
            }
        });

        this.refresh();
    }

    public refresh() {
        this._status = this.runScan();
        if (this._view) {
            this._view.webview.html = this.getHtmlContent();
        }
    }

    public getStatus(): SyncStatus {
        return this._status;
    }

    private runScan(): SyncStatus {
        const tools: DetectedTool[] = [];
        const defs = [
            { id: 'gemini', name: 'Google Gemini', files: ['GEMINI.md', 'AGENTS.md', 'MEMORY.md'], dirs: ['.agent'] },
            { id: 'claude', name: 'Claude Code', files: ['CLAUDE.md'], dirs: ['.claude'] },
            { id: 'cursor', name: 'Cursor', files: ['.cursorrules'], dirs: ['.cursor'] },
            { id: 'cline', name: 'Cline / Roo', files: ['.clinerules'], dirs: ['.cline'] },
            { id: 'windsurf', name: 'Windsurf', files: ['.windsurfrules'], dirs: [] },
            { id: 'copilot', name: 'GitHub Copilot', files: ['.github/copilot-instructions.md'], dirs: ['.github'] },
            { id: 'codex', name: 'OpenAI Codex', files: ['CODEX.md', 'codex.md'], dirs: [] },
            { id: 'aider', name: 'Aider', files: ['.aider.conf.yml', 'CONVENTIONS.md'], dirs: ['.aider'] },
        ];

        for (const def of defs) {
            const found: string[] = [];
            for (const f of def.files) {
                if (fs.existsSync(path.join(this.workspaceRoot, f))) found.push(f);
            }
            for (const d of def.dirs) {
                if (fs.existsSync(path.join(this.workspaceRoot, d))) found.push(d + '/');
            }
            if (found.length > 0) {
                tools.push({ id: def.id, name: def.name, files: found });
            }
        }

        // Check pending via dry-run (fast, no I/O writes)
        let pendingSections = 0;
        let conflictCount = 0;

        if (tools.length >= 2) {
            try {
                const result = cp.execSync('aigit sync --dry-run 2>&1', {
                    cwd: this.workspaceRoot,
                    timeout: 10000,
                    encoding: 'utf8',
                });
                const addMatches = result.match(/\+ "/g);
                pendingSections = addMatches ? addMatches.length : 0;
            } catch { /* aigit not available, skip */ }

            const conflictsPath = path.join(this.workspaceRoot, '.aigit', 'conflicts.json');
            if (fs.existsSync(conflictsPath)) {
                try {
                    const parsed = JSON.parse(fs.readFileSync(conflictsPath, 'utf8'));
                    conflictCount = Array.isArray(parsed) ? parsed.length : 0;
                } catch { /* */ }
            }
        }

        return { tools, pendingSections, conflictCount };
    }

    private getHtmlContent(): string {
        const { tools, pendingSections, conflictCount } = this._status;

        const toolsHtml = tools.length > 0
            ? tools.map(t => {
                const badge = conflictCount > 0 ? '🔴' : pendingSections > 0 ? '🟡' : '✅';
                const fileLinks = t.files.map(f =>
                    `<span class="file-link" data-file="${f}">${f}</span>`
                ).join(', ');
                return `<div class="tool-row">
                    <span class="tool-icon">🤖</span>
                    <span class="tool-name">${t.name}</span>
                    <span class="tool-badge">${badge}</span>
                    <div class="tool-files">${fileLinks}</div>
                </div>`;
            }).join('')
            : '<p class="empty">No AI tools detected. Add config files to get started.</p>';

        const syncLabel = pendingSections > 0
            ? `<span class="pending">${pendingSections} section(s) can be synced</span>`
            : '<span class="synced">All tools in sync</span>';

        const conflictLabel = conflictCount > 0
            ? `<span class="conflict">${conflictCount} conflict(s) found</span>`
            : '<span class="synced">0 conflicts</span>';

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background: var(--vscode-sideBar-background);
            padding: 8px;
        }
        h2 {
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            color: var(--vscode-descriptionForeground);
            margin-bottom: 10px;
            padding-bottom: 6px;
            border-bottom: 1px solid var(--vscode-widget-border);
        }
        .tool-row {
            display: flex;
            align-items: center;
            flex-wrap: wrap;
            padding: 6px 8px;
            margin-bottom: 4px;
            border-radius: 4px;
            background: var(--vscode-editor-background);
        }
        .tool-row:hover { background: var(--vscode-list-hoverBackground); }
        .tool-icon { margin-right: 6px; }
        .tool-name { font-weight: 600; flex: 1; font-size: 12px; }
        .tool-badge { font-size: 12px; margin-left: 4px; }
        .tool-files {
            width: 100%;
            margin-top: 3px;
            padding-left: 22px;
            font-size: 10px;
            color: var(--vscode-descriptionForeground);
        }
        .file-link {
            color: var(--vscode-textLink-foreground);
            cursor: pointer;
            text-decoration: underline;
        }
        .file-link:hover { color: var(--vscode-textLink-activeForeground); }
        .status-block {
            padding: 8px 10px;
            margin: 8px 0;
            border-radius: 4px;
            background: var(--vscode-editor-background);
            font-size: 12px;
            line-height: 1.6;
        }
        .pending { color: #e2b93d; }
        .conflict { color: #f44747; font-weight: 600; }
        .synced { color: #89d185; }
        .actions { margin-top: 10px; display: flex; flex-wrap: wrap; gap: 4px; }
        .btn {
            padding: 4px 10px;
            font-size: 11px;
            border: 1px solid var(--vscode-button-border, var(--vscode-widget-border));
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            border-radius: 3px;
            cursor: pointer;
        }
        .btn:hover { background: var(--vscode-button-secondaryHoverBackground); }
        .btn-primary {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
        }
        .btn-primary:hover { background: var(--vscode-button-hoverBackground); }
        .empty {
            color: var(--vscode-descriptionForeground);
            font-style: italic;
            padding: 12px 0;
        }
    </style>
</head>
<body>
    <h2>🔄 Agent Sync Dashboard</h2>

    <div id="tools">${toolsHtml}</div>

    <div class="status-block">
        ${syncLabel}<br/>
        ${conflictLabel}
    </div>

    <div class="actions">
        <button class="btn" onclick="send('aigit.scan')">🔍 Scan</button>
        <button class="btn" onclick="send('aigit.syncDryRun')">📋 Dry Run</button>
        <button class="btn btn-primary" onclick="send('aigit.sync')">🔄 Sync</button>
        <button class="btn" onclick="send('aigit.syncSkills')">🛠️ Sync Skills</button>
        <button class="btn" onclick="send('aigit.showConflicts')">⚠️ Conflicts</button>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        function send(cmd) { vscode.postMessage({ command: cmd }); }
        document.querySelectorAll('.file-link').forEach(el => {
            el.addEventListener('click', () => {
                vscode.postMessage({ command: 'openFile', file: el.dataset.file });
            });
        });
    </script>
</body>
</html>`;
    }
}
