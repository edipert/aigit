"use strict";
/**
 * Symbol resolution utility shared between the CLI (index.ts) and argUtils.ts.
 * Resolves the enclosing AST symbol from a (filePath, lineNumber) pair.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveSymbolContext = resolveSymbolContext;
const resolver_1 = require("../ast/resolver");
/**
 * Given raw tool arguments, attempt to resolve the enclosing symbol.
 * Falls back gracefully if lineNumber is missing or AST parsing fails.
 */
function resolveSymbolContext(args) {
    let symName = args?.symbolName ? String(args.symbolName) : null;
    let symType = args?.symbolType ? String(args.symbolType) : null;
    let symRange = null;
    if (!symName && args?.filePath && args?.lineNumber) {
        try {
            const resolved = (0, resolver_1.resolveSymbolAtLine)(String(args.filePath), Number(args.lineNumber));
            if (resolved) {
                symName = resolved.qualifiedName;
                symType = resolved.type;
                symRange = (0, resolver_1.formatRange)(resolved.range);
            }
        }
        catch { /* graceful fallback */ }
    }
    return { symName, symType, symRange };
}
