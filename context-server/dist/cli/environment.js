"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectProjectType = detectProjectType;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
function detectProjectType(workspacePath) {
    if (fs_1.default.existsSync(path_1.default.join(workspacePath, 'next.config.js')) || fs_1.default.existsSync(path_1.default.join(workspacePath, 'next.config.mjs')) || fs_1.default.existsSync(path_1.default.join(workspacePath, 'next.config.ts'))) {
        return 'web-frontend (Next.js)';
    }
    if (fs_1.default.existsSync(path_1.default.join(workspacePath, 'App.tsx')) || fs_1.default.existsSync(path_1.default.join(workspacePath, 'app.json'))) {
        return 'mobile (React Native/Expo)';
    }
    if (fs_1.default.existsSync(path_1.default.join(workspacePath, 'prisma', 'schema.prisma')) || fs_1.default.existsSync(path_1.default.join(workspacePath, 'package.json'))) {
        // Check if it looks like backend
        const pkg = JSON.parse(fs_1.default.readFileSync(path_1.default.join(workspacePath, 'package.json'), 'utf8'));
        if (pkg.dependencies?.express || pkg.devDependencies?.prisma) {
            return 'backend (Node/Express/Prisma)';
        }
    }
    return 'unknown';
}
