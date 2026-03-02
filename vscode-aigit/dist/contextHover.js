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
exports.AigitContextHoverProvider = void 0;
const vscode = __importStar(require("vscode"));
/**
 * HoverProvider that shows aigit context when hovering over code
 * that has linked memories or decisions.
 */
class AigitContextHoverProvider {
    constructor(cache) {
        this.cache = cache;
    }
    provideHover(document, position) {
        const entries = this.cache.getForFile(document.uri.fsPath);
        if (!entries || entries.length === 0)
            return null;
        // Find entries near the cursor line (±2 lines tolerance)
        const line = position.line + 1; // 1-indexed
        const nearby = entries.filter((e) => e.lineNumber && Math.abs(e.lineNumber - line) <= 2);
        if (nearby.length === 0)
            return null;
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
            if (date)
                md.appendMarkdown(` — ${date}`);
            md.appendMarkdown('\n\n');
            if (entry.type === 'decision') {
                md.appendMarkdown(`> **Context:** ${entry.content}\n\n`);
                if (entry.chosen)
                    md.appendMarkdown(`> ✅ **Chosen:** ${entry.chosen}\n\n`);
                if (entry.reasoning)
                    md.appendMarkdown(`> 💡 **Why:** ${entry.reasoning}\n\n`);
            }
            else {
                md.appendMarkdown(`> ${entry.content}\n\n`);
            }
            md.appendMarkdown('---\n\n');
        }
        return new vscode.Hover(md);
    }
}
exports.AigitContextHoverProvider = AigitContextHoverProvider;
//# sourceMappingURL=contextHover.js.map