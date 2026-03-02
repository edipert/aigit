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
exports.SyncStatusBar = void 0;
const vscode = __importStar(require("vscode"));
class SyncStatusBar {
    constructor() {
        this.item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 50);
        this.item.command = 'aigit.scan';
        this.item.tooltip = 'Click to scan AI tools';
        this.item.show();
        this.setIdle();
    }
    update(toolCount, pending, conflicts) {
        if (conflicts > 0) {
            this.item.text = `$(warning) Aigit: ${conflicts} conflict(s)`;
            this.item.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
            this.item.tooltip = `${toolCount} tools detected, ${conflicts} conflict(s) blocking sync`;
        }
        else if (pending > 0) {
            this.item.text = `$(sync) Aigit: ${pending} pending`;
            this.item.backgroundColor = undefined;
            this.item.tooltip = `${toolCount} tools detected, ${pending} section(s) need syncing`;
        }
        else if (toolCount > 0) {
            this.item.text = `$(check) Aigit: ${toolCount} tools ✅`;
            this.item.backgroundColor = undefined;
            this.item.tooltip = `${toolCount} AI tools detected, all in sync`;
        }
        else {
            this.setIdle();
        }
    }
    setIdle() {
        this.item.text = '$(brain) Aigit';
        this.item.backgroundColor = undefined;
        this.item.tooltip = 'Click to scan AI tools';
    }
    dispose() {
        this.item.dispose();
    }
}
exports.SyncStatusBar = SyncStatusBar;
//# sourceMappingURL=statusBar.js.map