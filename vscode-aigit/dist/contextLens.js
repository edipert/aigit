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
exports.AigitContextLensProvider = void 0;
const vscode = __importStar(require("vscode"));
/**
 * CodeLensProvider that shows inline context hints above functions/classes
 * that have linked aigit memories or decisions.
 */
class AigitContextLensProvider {
    constructor(cache) {
        this.cache = cache;
        this._onDidChangeCodeLenses = new vscode.EventEmitter();
        this.onDidChangeCodeLenses = this._onDidChangeCodeLenses.event;
        cache.onDidUpdate(() => this._onDidChangeCodeLenses.fire());
    }
    provideCodeLenses(document) {
        const entries = this.cache.getForFile(document.uri.fsPath);
        if (!entries || entries.length === 0)
            return [];
        const lenses = [];
        for (const entry of entries) {
            if (!entry.lineNumber || entry.lineNumber < 1)
                continue;
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
    formatLabel(entry) {
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
exports.AigitContextLensProvider = AigitContextLensProvider;
//# sourceMappingURL=contextLens.js.map