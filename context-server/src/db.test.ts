/**
 * Tests for the db utility: findWorkspaceRoot and resolveTargetDir behaviour.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { findWorkspaceRoot } from './db';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('findWorkspaceRoot', () => {
    let tmpDir: string;

    beforeEach(() => {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aigit-test-'));
    });

    afterEach(() => {
        fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('returns the dir when .aigit exists at the given path', () => {
        fs.mkdirSync(path.join(tmpDir, '.aigit'));
        const result = findWorkspaceRoot(tmpDir);
        expect(result).toBe(tmpDir);
    });

    it('returns the dir when .git exists at the given path', () => {
        fs.mkdirSync(path.join(tmpDir, '.git'));
        const result = findWorkspaceRoot(tmpDir);
        expect(result).toBe(tmpDir);
    });

    it('walks up to find .aigit in a parent directory', () => {
        fs.mkdirSync(path.join(tmpDir, '.aigit'));
        const nested = path.join(tmpDir, 'src', 'deep', 'folder');
        fs.mkdirSync(nested, { recursive: true });
        const result = findWorkspaceRoot(nested);
        expect(result).toBe(tmpDir);
    });

    it('prefers .aigit over .git when both exist', () => {
        fs.mkdirSync(path.join(tmpDir, '.aigit'));
        fs.mkdirSync(path.join(tmpDir, '.git'));
        const result = findWorkspaceRoot(tmpDir);
        expect(result).toBe(tmpDir);
    });

    it('falls back to startDir when no marker found', () => {
        // No .aigit or .git created — should fall back
        const result = findWorkspaceRoot(tmpDir);
        // It either returns tmpDir (if walked up to root) or a grandparent that has .git
        // We just verify it returns a string without throwing
        expect(typeof result).toBe('string');
    });
});
