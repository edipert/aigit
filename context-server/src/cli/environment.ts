import fs from 'fs';
import path from 'path';

export function detectProjectType(workspacePath: string): string {
    if (fs.existsSync(path.join(workspacePath, 'next.config.js')) || fs.existsSync(path.join(workspacePath, 'next.config.mjs')) || fs.existsSync(path.join(workspacePath, 'next.config.ts'))) {
        return 'web-frontend (Next.js)';
    }
    if (fs.existsSync(path.join(workspacePath, 'App.tsx')) || fs.existsSync(path.join(workspacePath, 'app.json'))) {
        return 'mobile (React Native/Expo)';
    }
    if (fs.existsSync(path.join(workspacePath, 'prisma', 'schema.prisma')) || fs.existsSync(path.join(workspacePath, 'package.json'))) {
        // Check if it looks like backend
        const pkg = JSON.parse(fs.readFileSync(path.join(workspacePath, 'package.json'), 'utf8'));
        if (pkg.dependencies?.express || pkg.devDependencies?.prisma) {
            return 'backend (Node/Express/Prisma)';
        }
    }
    return 'unknown';
}
