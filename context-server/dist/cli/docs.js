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
exports.exportDocs = exportDocs;
const git_1 = require("./git");
const generator_1 = require("../docs/generator");
const db_1 = require("../db");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
async function exportDocs(options) {
    console.log(`[aigit] Scanning context ledger...`);
    const project = await db_1.prisma.project.findFirst();
    if (!project) {
        console.error('❌ Could not determine project name. Run aigit init.');
        process.exit(1);
    }
    const branch = (0, git_1.getActiveBranch)(process.cwd());
    const projectName = project.name;
    try {
        console.log(`[aigit] Generating architecture documentation for ${projectName} on branch ${branch}...`);
        const mdContent = await (0, generator_1.generateArchitectureDocs)(projectName, branch);
        const outPath = options.out ? path.resolve(process.cwd(), options.out) : path.join(process.cwd(), 'ARCHITECTURE.md');
        fs.writeFileSync(outPath, mdContent, 'utf-8');
        console.log(`✅ Success! Generated documentation at: ${outPath}`);
    }
    catch (err) {
        console.error(`❌ Error generating documentation: ${err.message}`);
        process.exit(1);
    }
}
