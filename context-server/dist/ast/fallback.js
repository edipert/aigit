"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractSymbolsFallback = extractSymbolsFallback;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const LANGUAGE_PATTERNS = [
    {
        extensions: ['.py'],
        patterns: [
            { regex: /^(\s*)def\s+(\w+)\s*\(/gm, type: 'function' },
            { regex: /^(\s*)class\s+(\w+)/gm, type: 'class' },
            { regex: /^(\s*)async\s+def\s+(\w+)\s*\(/gm, type: 'function' },
        ]
    },
    {
        extensions: ['.go'],
        patterns: [
            { regex: /^func\s+(\w+)\s*\(/gm, type: 'function' },
            { regex: /^func\s+\(\w+\s+\*?(\w+)\)\s+(\w+)\s*\(/gm, type: 'method' },
            { regex: /^type\s+(\w+)\s+struct/gm, type: 'class' },
        ]
    },
    {
        extensions: ['.rs'],
        patterns: [
            { regex: /^\s*(?:pub\s+)?fn\s+(\w+)/gm, type: 'function' },
            { regex: /^\s*(?:pub\s+)?struct\s+(\w+)/gm, type: 'class' },
            { regex: /^\s*impl(?:<[^>]+>)?\s+(\w+)/gm, type: 'class' },
        ]
    },
    {
        extensions: ['.rb'],
        patterns: [
            { regex: /^\s*def\s+(\w+)/gm, type: 'function' },
            { regex: /^\s*class\s+(\w+)/gm, type: 'class' },
        ]
    },
    {
        extensions: ['.java', '.kt', '.kts'],
        patterns: [
            { regex: /(?:public|private|protected|static)?\s*(?:\w+\s+)?(\w+)\s*\([^)]*\)\s*\{/gm, type: 'function' },
            { regex: /(?:public|private)?\s*class\s+(\w+)/gm, type: 'class' },
        ]
    },
    {
        extensions: ['.c', '.cpp', '.cc', '.h', '.hpp'],
        patterns: [
            { regex: /^\s*(?:\w+\s+)+(\w+)\s*\([^)]*\)\s*\{/gm, type: 'function' },
            { regex: /^\s*(?:class|struct)\s+(\w+)/gm, type: 'class' },
        ]
    },
];
function extractSymbolsFallback(filePath) {
    const ext = path_1.default.extname(filePath).toLowerCase();
    const lang = LANGUAGE_PATTERNS.find(l => l.extensions.includes(ext));
    if (!lang)
        return [];
    let content;
    try {
        content = fs_1.default.readFileSync(filePath, 'utf8');
    }
    catch {
        return [];
    }
    const lines = content.split('\n');
    const symbols = [];
    for (const patternDef of lang.patterns) {
        const regex = new RegExp(patternDef.regex.source, patternDef.regex.flags);
        let match;
        while ((match = regex.exec(content)) !== null) {
            // Get the last capture group (the name)
            const name = match[match.length - 1] || match[1];
            if (!name)
                continue;
            const startLine = content.substring(0, match.index).split('\n').length;
            // Estimate end line: find next blank line or end of indented block
            let endLine = startLine;
            const indent = match[0].length - match[0].trimStart().length;
            for (let i = startLine; i < lines.length; i++) {
                const line = lines[i];
                if (i > startLine && line.trim().length > 0) {
                    const lineIndent = line.length - line.trimStart().length;
                    if (lineIndent <= indent && !line.trim().startsWith('}') && !line.trim().startsWith('end')) {
                        endLine = i;
                        break;
                    }
                }
                endLine = i + 1;
            }
            symbols.push({
                name,
                qualifiedName: name,
                type: patternDef.type,
                range: { startLine, startCol: 0, endLine, endCol: 0 },
                filePath,
            });
        }
    }
    return symbols;
}
