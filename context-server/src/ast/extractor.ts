import { Project, SyntaxKind, SourceFile, Node } from 'ts-morph';
import path from 'path';

export interface CodeSymbol {
    name: string;
    qualifiedName: string;
    type: 'function' | 'class' | 'method' | 'export' | 'variable';
    range: { startLine: number; startCol: number; endLine: number; endCol: number };
    filePath: string;
}

export function extractSymbols(filePath: string): CodeSymbol[] {
    const ext = path.extname(filePath).toLowerCase();
    if (!['.ts', '.tsx', '.js', '.jsx', '.mts', '.mjs'].includes(ext)) {
        return [];
    }

    try {
        const project = new Project({ compilerOptions: { allowJs: true } });
        const sourceFile = project.addSourceFileAtPath(filePath);
        return extractFromSourceFile(sourceFile, filePath);
    } catch {
        return [];
    }
}

function extractFromSourceFile(sourceFile: SourceFile, filePath: string): CodeSymbol[] {
    const symbols: CodeSymbol[] = [];

    // Top-level functions
    for (const fn of sourceFile.getFunctions()) {
        const name = fn.getName();
        if (!name) continue;
        symbols.push(nodeToSymbol(fn, name, name, 'function', filePath));
    }

    // Classes and their methods
    for (const cls of sourceFile.getClasses()) {
        const className = cls.getName();
        if (!className) continue;
        symbols.push(nodeToSymbol(cls, className, className, 'class', filePath));

        for (const method of cls.getMethods()) {
            const methodName = method.getName();
            symbols.push(nodeToSymbol(method, methodName, `${className}.${methodName}`, 'method', filePath));
        }
    }

    // Exported variable declarations (arrow functions, constants)
    for (const varStmt of sourceFile.getVariableStatements()) {
        const isExported = varStmt.isExported();
        for (const decl of varStmt.getDeclarations()) {
            const name = decl.getName();
            const init = decl.getInitializer();

            // Arrow functions or function expressions
            if (init && (init.getKind() === SyntaxKind.ArrowFunction || init.getKind() === SyntaxKind.FunctionExpression)) {
                symbols.push(nodeToSymbol(decl, name, name, isExported ? 'export' : 'function', filePath));
            } else if (isExported) {
                symbols.push(nodeToSymbol(decl, name, name, 'variable', filePath));
            }
        }
    }

    // Standalone export declarations
    for (const exportDecl of sourceFile.getExportDeclarations()) {
        for (const named of exportDecl.getNamedExports()) {
            const name = named.getName();
            symbols.push(nodeToSymbol(named, name, name, 'export', filePath));
        }
    }

    return symbols;
}

function nodeToSymbol(node: Node, name: string, qualifiedName: string, type: CodeSymbol['type'], filePath: string): CodeSymbol {
    const startLine = node.getStartLineNumber();
    const endLine = node.getEndLineNumber();
    const sf = node.getSourceFile();
    const startPos = sf.getLineAndColumnAtPos(node.getStart());
    const endPos = sf.getLineAndColumnAtPos(node.getEnd());

    return {
        name,
        qualifiedName,
        type,
        range: { startLine, startCol: startPos.column, endLine, endCol: endPos.column },
        filePath,
    };
}

/**
 * Find the symbol that encloses a given line number.
 * Returns the most specific (innermost) symbol.
 */
export function findEnclosingSymbol(filePath: string, line: number): CodeSymbol | null {
    const symbols = extractSymbols(filePath);
    let best: CodeSymbol | null = null;
    let bestSpan = Infinity;

    for (const sym of symbols) {
        if (line >= sym.range.startLine && line <= sym.range.endLine) {
            const span = sym.range.endLine - sym.range.startLine;
            if (span < bestSpan) {
                bestSpan = span;
                best = sym;
            }
        }
    }
    return best;
}
