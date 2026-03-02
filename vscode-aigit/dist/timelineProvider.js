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
exports.TimelineProvider = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class TimelineProvider {
    constructor(extensionUri, workspaceRoot) {
        this.extensionUri = extensionUri;
        this.workspaceRoot = workspaceRoot;
    }
    resolveWebviewView(webviewView, _context, _token) {
        this._view = webviewView;
        webviewView.webview.options = {
            enableScripts: true
        };
        this.refresh();
    }
    refresh() {
        if (!this._view) {
            return;
        }
        this._view.webview.html = this.getHtmlContent();
    }
    getHtmlContent() {
        const ledgerPath = path.join(this.workspaceRoot, '.aigit', 'ledger.json');
        let ledger = { memories: [], decisions: [], tasks: [] };
        if (fs.existsSync(ledgerPath)) {
            try {
                ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
            }
            catch {
                // Corrupted ledger, use empty default
            }
        }
        // Get the currently active file for filtering
        const activeFile = vscode.window.activeTextEditor?.document.uri.fsPath;
        const relActiveFile = activeFile ? path.relative(this.workspaceRoot, activeFile) : null;
        // Combine and sort all entries chronologically
        const allEntries = [
            ...ledger.memories.map(e => ({ kind: 'MEMORY', entry: e })),
            ...ledger.decisions.map(e => ({ kind: 'DECISION', entry: e }))
        ].sort((a, b) => {
            const da = a.entry.createdAt ? new Date(a.entry.createdAt).getTime() : 0;
            const db = b.entry.createdAt ? new Date(b.entry.createdAt).getTime() : 0;
            return db - da;
        });
        // Separate file-anchored entries
        const anchored = relActiveFile
            ? allEntries.filter(e => e.entry.filePath?.includes(relActiveFile))
            : [];
        const recent = allEntries.slice(0, 20);
        const anchoredHtml = anchored.length > 0 ? `
            <div class="section">
                <h3>📌 Anchored to: <code>${relActiveFile}</code></h3>
                ${anchored.map(e => this.renderEntry(e.kind, e.entry)).join('')}
            </div>
            <hr/>
        ` : '';
        const recentHtml = recent.length > 0
            ? recent.map(e => this.renderEntry(e.kind, e.entry)).join('')
            : '<p class="empty">No context entries yet. Run <code>aigit dump</code> to populate.</p>';
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
        h3 {
            font-size: 11px;
            color: var(--vscode-textLink-foreground);
            margin-bottom: 8px;
        }
        .entry {
            padding: 8px 10px;
            margin-bottom: 6px;
            border-radius: 4px;
            background: var(--vscode-editor-background);
            border-left: 3px solid transparent;
            cursor: pointer;
            transition: background 0.15s;
        }
        .entry:hover {
            background: var(--vscode-list-hoverBackground);
        }
        .entry.memory { border-left-color: #4fc1ff; }
        .entry.decision { border-left-color: #c3e88d; }
        .entry-kind {
            font-size: 9px;
            text-transform: uppercase;
            letter-spacing: 1px;
            font-weight: 700;
            margin-bottom: 3px;
        }
        .entry.memory .entry-kind { color: #4fc1ff; }
        .entry.decision .entry-kind { color: #c3e88d; }
        .entry-content {
            font-size: 12px;
            line-height: 1.4;
            color: var(--vscode-foreground);
        }
        .entry-meta {
            font-size: 10px;
            color: var(--vscode-descriptionForeground);
            margin-top: 4px;
        }
        .entry-anchor {
            font-size: 10px;
            color: var(--vscode-textLink-foreground);
            margin-top: 2px;
        }
        .empty {
            color: var(--vscode-descriptionForeground);
            font-style: italic;
            padding: 12px 0;
        }
        code {
            font-family: var(--vscode-editor-font-family);
            font-size: 11px;
            background: var(--vscode-textBlockQuote-background);
            padding: 1px 4px;
            border-radius: 3px;
        }
        hr {
            border: none;
            border-top: 1px solid var(--vscode-widget-border);
            margin: 12px 0;
        }
        .btn {
            display: inline-block;
            padding: 4px 10px;
            font-size: 11px;
            border: 1px solid var(--vscode-button-border, var(--vscode-widget-border));
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            border-radius: 3px;
            cursor: pointer;
            margin-right: 4px;
            margin-bottom: 8px;
        }
        .btn:hover {
            background: var(--vscode-button-secondaryHoverBackground);
        }
        .actions { margin-bottom: 12px; }
    </style>
</head>
<body>
    <h2>⚡ Aigit Context Timeline</h2>
    <div class="actions">
        <button class="btn" onclick="triggerCommand('aigit.showTimeline')">↻ Refresh</button>
        <button class="btn" onclick="triggerCommand('aigit.dump')">💾 Dump</button>
        <button class="btn" onclick="triggerCommand('aigit.load')">📥 Load</button>
    </div>

    ${anchoredHtml}

    <div class="section">
        <h3>🕐 Recent Context</h3>
        ${recentHtml}
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        function triggerCommand(cmd) {
            vscode.postMessage({ command: cmd });
        }
    </script>
</body>
</html>`;
    }
    renderEntry(kind, entry) {
        const cls = kind.toLowerCase();
        const content = kind === 'DECISION'
            ? `${entry.context || ''} ➔ <strong>${entry.chosen || ''}</strong>`
            : (entry.content || '');
        const date = entry.createdAt
            ? new Date(entry.createdAt).toLocaleString()
            : '';
        const branch = entry.gitBranch || 'main';
        const anchor = entry.filePath
            ? `<div class="entry-anchor">📎 ${entry.filePath}${entry.lineNumber ? ':L' + entry.lineNumber : ''}</div>`
            : '';
        return `
            <div class="entry ${cls}" title="ID: ${entry.id}">
                <div class="entry-kind">${kind}</div>
                <div class="entry-content">${content}</div>
                ${anchor}
                <div class="entry-meta">${branch} · ${date}</div>
            </div>
        `;
    }
}
exports.TimelineProvider = TimelineProvider;
//# sourceMappingURL=timelineProvider.js.map