import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resolveSymbolContext } from './symbolUtils';
import { resolveSymbolAtLine, formatRange } from '../ast/resolver';

// Mock the ast resolver dependencies
vi.mock('../ast/resolver', () => ({
    resolveSymbolAtLine: vi.fn(),
    formatRange: vi.fn(),
}));

describe('resolveSymbolContext', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('handles undefined args', () => {
        const result = resolveSymbolContext(undefined);
        expect(result).toEqual({ symName: null, symType: null, symRange: null });
    });

    it('handles null args', () => {
        const result = resolveSymbolContext(null);
        expect(result).toEqual({ symName: null, symType: null, symRange: null });
    });

    it('handles empty args object', () => {
        const result = resolveSymbolContext({});
        expect(result).toEqual({ symName: null, symType: null, symRange: null });
    });

    it('prioritizes explicit symbolName and symbolType', () => {
        const args = {
            symbolName: 'explicitName',
            symbolType: 'explicitType',
            filePath: 'test.ts',
            lineNumber: 10,
        };

        const result = resolveSymbolContext(args);

        expect(result).toEqual({
            symName: 'explicitName',
            symType: 'explicitType',
            symRange: null,
        });

        // Ensure we did not try to resolve from AST because symbolName was provided
        expect(resolveSymbolAtLine).not.toHaveBeenCalled();
    });

    it('resolves symbol from AST when symbolName is missing but filePath and lineNumber are provided', () => {
        const args = {
            filePath: 'src/utils.ts',
            lineNumber: 42,
        };

        const mockResolved = {
            qualifiedName: 'resolvedName',
            type: 'function',
            range: { startLine: 40, endLine: 50 },
        };

        vi.mocked(resolveSymbolAtLine).mockReturnValue(mockResolved as any);
        vi.mocked(formatRange).mockReturnValue('40:0-50:0');

        const result = resolveSymbolContext(args);

        expect(resolveSymbolAtLine).toHaveBeenCalledWith('src/utils.ts', 42);
        expect(formatRange).toHaveBeenCalledWith(mockResolved.range);

        expect(result).toEqual({
            symName: 'resolvedName',
            symType: 'function',
            symRange: '40:0-50:0',
        });
    });

    it('handles cases where resolveSymbolAtLine returns null or undefined', () => {
        const args = {
            filePath: 'src/utils.ts',
            lineNumber: 42,
        };

        vi.mocked(resolveSymbolAtLine).mockReturnValue(null);

        const result = resolveSymbolContext(args);

        expect(resolveSymbolAtLine).toHaveBeenCalledWith('src/utils.ts', 42);
        expect(result).toEqual({ symName: null, symType: null, symRange: null });
    });

    it('handles exceptions thrown by resolveSymbolAtLine gracefully', () => {
        const args = {
            filePath: 'src/utils.ts',
            lineNumber: 42,
        };

        vi.mocked(resolveSymbolAtLine).mockImplementation(() => {
            throw new Error('AST parsing failed');
        });

        // The function should catch the error and return default nulls
        const result = resolveSymbolContext(args);

        expect(resolveSymbolAtLine).toHaveBeenCalledWith('src/utils.ts', 42);
        expect(result).toEqual({ symName: null, symType: null, symRange: null });
    });

    it('converts non-string args to strings safely', () => {
        const args = {
            symbolName: 12345,
            symbolType: true,
        };

        const result = resolveSymbolContext(args);

        expect(result).toEqual({
            symName: '12345',
            symType: 'true',
            symRange: null,
        });
    });
});
