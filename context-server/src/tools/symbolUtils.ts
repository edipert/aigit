/**
 * Symbol resolution utility shared between the CLI (index.ts) and argUtils.ts.
 * Resolves the enclosing AST symbol from a (filePath, lineNumber) pair.
 */

import { resolveSymbolAtLine, formatRange } from '../ast/resolver';

export interface ResolvedSymbol {
    symName: string | null;
    symType: string | null;
    symRange: string | null;
}

/**
 * Given raw tool arguments, attempt to resolve the enclosing symbol.
 * Falls back gracefully if lineNumber is missing or AST parsing fails.
 */
export function resolveSymbolContext(args: Record<string, unknown> | undefined | null): ResolvedSymbol {
    let symName = args?.symbolName ? String(args.symbolName) : null;
    let symType = args?.symbolType ? String(args.symbolType) : null;
    let symRange: string | null = null;

    if (!symName && args?.filePath && args?.lineNumber) {
        try {
            const resolved = resolveSymbolAtLine(String(args.filePath), Number(args.lineNumber));
            if (resolved) {
                symName = resolved.qualifiedName;
                symType = resolved.type;
                symRange = formatRange(resolved.range);
            }
        } catch { /* graceful fallback */ }
    }

    return { symName, symType, symRange };
}
