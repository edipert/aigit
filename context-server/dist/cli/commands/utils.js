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
exports.getOrCreateDefaultProject = getOrCreateDefaultProject;
exports.afterWrite = afterWrite;
const path = __importStar(require("path"));
const db_1 = require("../../db");
const sync_1 = require("../sync");
/**
 * Ensures a default project exists for the given workspace.
 * Extracted from 4 copy-pasted blocks across cli/index.ts.
 */
async function getOrCreateDefaultProject(workspacePath) {
    let project = await db_1.prisma.project.findFirst();
    if (!project) {
        project = await db_1.prisma.project.create({
            data: { name: path.basename(workspacePath) },
        });
    }
    return project;
}
/**
 * Persists the context ledger after any write operation.
 * Replaces inline `require('./sync').dumpContextLedger(...)` calls.
 */
async function afterWrite(workspacePath) {
    await (0, sync_1.dumpContextLedger)(workspacePath);
}
