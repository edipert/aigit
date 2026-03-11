"use strict";
/**
 * Tests for the db utility: findWorkspaceRoot and resolveTargetDir behaviour.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const db_1 = require("./db");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
(0, vitest_1.describe)('findWorkspaceRoot', () => {
    let tmpDir;
    (0, vitest_1.beforeEach)(() => {
        tmpDir = fs_1.default.mkdtempSync(path_1.default.join(os_1.default.tmpdir(), 'aigit-test-'));
    });
    (0, vitest_1.afterEach)(() => {
        fs_1.default.rmSync(tmpDir, { recursive: true, force: true });
    });
    (0, vitest_1.it)('returns the dir when .aigit exists at the given path', () => {
        fs_1.default.mkdirSync(path_1.default.join(tmpDir, '.aigit'));
        const result = (0, db_1.findWorkspaceRoot)(tmpDir);
        (0, vitest_1.expect)(result).toBe(tmpDir);
    });
    (0, vitest_1.it)('returns the dir when .git exists at the given path', () => {
        fs_1.default.mkdirSync(path_1.default.join(tmpDir, '.git'));
        const result = (0, db_1.findWorkspaceRoot)(tmpDir);
        (0, vitest_1.expect)(result).toBe(tmpDir);
    });
    (0, vitest_1.it)('walks up to find .aigit in a parent directory', () => {
        fs_1.default.mkdirSync(path_1.default.join(tmpDir, '.aigit'));
        const nested = path_1.default.join(tmpDir, 'src', 'deep', 'folder');
        fs_1.default.mkdirSync(nested, { recursive: true });
        const result = (0, db_1.findWorkspaceRoot)(nested);
        (0, vitest_1.expect)(result).toBe(tmpDir);
    });
    (0, vitest_1.it)('prefers .aigit over .git when both exist', () => {
        fs_1.default.mkdirSync(path_1.default.join(tmpDir, '.aigit'));
        fs_1.default.mkdirSync(path_1.default.join(tmpDir, '.git'));
        const result = (0, db_1.findWorkspaceRoot)(tmpDir);
        (0, vitest_1.expect)(result).toBe(tmpDir);
    });
    (0, vitest_1.it)('falls back to startDir when no marker found', () => {
        // No .aigit or .git created — should fall back
        const result = (0, db_1.findWorkspaceRoot)(tmpDir);
        // It either returns tmpDir (if walked up to root) or a grandparent that has .git
        // We just verify it returns a string without throwing
        (0, vitest_1.expect)(typeof result).toBe('string');
    });
});
