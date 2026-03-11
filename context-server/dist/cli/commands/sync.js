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
const sync_1 = require("../sync");
const sync_2 = require("../../agents/sync");
const conflicts_1 = require("../../agents/conflicts");
const output_1 = require("../output");
const handler = async ({ args, workspacePath, command }) => {
    if (command === 'dump') {
        await (0, output_1.withSpinner)('Serializing memory → .aigit/ledger.json', () => (0, sync_1.dumpContextLedger)(workspacePath));
        (0, output_1.ok)('Context ledger saved.');
    }
    else if (command === 'load') {
        await (0, output_1.withSpinner)('Importing .aigit/ledger.json → memory DB', () => (0, sync_1.loadContextLedger)(workspacePath));
        (0, output_1.ok)('Context ledger loaded.');
    }
    else if (command === 'sync') {
        const dryRun = args.includes('--dry-run');
        const skillsMigrate = args.includes('--skills');
        const fromIdx = args.indexOf('--from');
        const toIdx = args.indexOf('--to');
        const from = fromIdx !== -1 ? args[fromIdx + 1] : undefined;
        const to = toIdx !== -1 ? args[toIdx + 1] : undefined;
        await (0, output_1.withSpinner)(dryRun ? 'Syncing AI tool configs (dry run)…' : 'Syncing AI tool configs…', async () => { (0, sync_2.syncAgents)(workspacePath, { dryRun, from, to }); });
        if (skillsMigrate && !dryRun) {
            const { migrateSkills } = await Promise.resolve().then(() => __importStar(require('../../agents/migration')));
            const result = await (0, output_1.withSpinner)('Migrating skills…', async () => migrateSkills(workspacePath));
            if (result.migrated.length > 0) {
                (0, output_1.ok)(`Unified ${result.migrated.length} skill folder(s) into .aigit/skills.`);
            }
            else {
                (0, output_1.ok)('No skill folders required migration.');
            }
            if (result.errors.length > 0) {
                result.errors.forEach((err) => (0, output_1.warn)(err));
            }
        }
    }
    else if (command === 'conflicts') {
        const conflicts = (0, conflicts_1.loadConflicts)(workspacePath);
        (0, conflicts_1.printConflicts)(conflicts);
    }
};
exports.default = handler;
