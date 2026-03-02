import * as vscode from 'vscode';

export class SyncStatusBar {
    private item: vscode.StatusBarItem;

    constructor() {
        this.item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 50);
        this.item.command = 'aigit.scan';
        this.item.tooltip = 'Click to scan AI tools';
        this.item.show();
        this.setIdle();
    }

    public update(toolCount: number, pending: number, conflicts: number) {
        if (conflicts > 0) {
            this.item.text = `$(warning) Aigit: ${conflicts} conflict(s)`;
            this.item.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
            this.item.tooltip = `${toolCount} tools detected, ${conflicts} conflict(s) blocking sync`;
        } else if (pending > 0) {
            this.item.text = `$(sync) Aigit: ${pending} pending`;
            this.item.backgroundColor = undefined;
            this.item.tooltip = `${toolCount} tools detected, ${pending} section(s) need syncing`;
        } else if (toolCount > 0) {
            this.item.text = `$(check) Aigit: ${toolCount} tools ✅`;
            this.item.backgroundColor = undefined;
            this.item.tooltip = `${toolCount} AI tools detected, all in sync`;
        } else {
            this.setIdle();
        }
    }

    private setIdle() {
        this.item.text = '$(brain) Aigit';
        this.item.backgroundColor = undefined;
        this.item.tooltip = 'Click to scan AI tools';
    }

    public dispose() {
        this.item.dispose();
    }
}
