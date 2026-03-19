"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = exports.client = void 0;
exports.findWorkspaceRoot = findWorkspaceRoot;
exports.initializeDatabase = initializeDatabase;
var client_1 = require("@prisma/client");
var pglite_1 = require("@electric-sql/pglite");
var pglite_prisma_adapter_1 = require("pglite-prisma-adapter");
// @ts-ignore — PGlite vector extension types missing from distribution
var vector_1 = require("@electric-sql/pglite/vector");
var path_1 = __importDefault(require("path"));
var fs_1 = __importDefault(require("fs"));
// ── Workspace resolution ──────────────────────────────────────────────────────
function findWorkspaceRoot(startDir) {
    var current = startDir;
    while (current !== path_1.default.parse(current).root) {
        if (fs_1.default.existsSync(path_1.default.join(current, '.aigit')) || fs_1.default.existsSync(path_1.default.join(current, '.git'))) {
            return current;
        }
        current = path_1.default.dirname(current);
    }
    return startDir;
}
/**
 * Resolve the target directory for the database.
 * When the CLI is invoked as `aigit mcp /path/to/project`, we use that explicit path.
 * Otherwise we walk up from cwd to find the workspace root.
 */
function resolveTargetDir() {
    var args = process.argv.slice(2);
    if (args[0] === 'mcp' && args[1]) {
        var candidate = args[1];
        return path_1.default.isAbsolute(candidate)
            ? candidate
            : path_1.default.resolve(process.cwd(), candidate);
    }
    return findWorkspaceRoot(process.cwd());
}
// ── DB path setup ─────────────────────────────────────────────────────────────
var targetDir = resolveTargetDir();
var AIGIT_DIR = path_1.default.join(targetDir, '.aigit');
var AIGIT_DB_PATH = path_1.default.join(AIGIT_DIR, 'memory.db');
if (!fs_1.default.existsSync(AIGIT_DIR)) {
    fs_1.default.mkdirSync(AIGIT_DIR, { recursive: true });
}
// ── PGlite + Prisma singletons ────────────────────────────────────────────────
exports.client = new pglite_1.PGlite(AIGIT_DB_PATH, { extensions: { vector: vector_1.vector } });
var adapter = new pglite_prisma_adapter_1.PrismaPGlite(exports.client);
exports.prisma = new client_1.PrismaClient({ adapter: adapter });
// ── Embedded base schema (replaces the fragile dual-path file lookup) ─────────
// This is the canonical schema for a fresh database.
// Append-only. Never mutate existing DDL — write a new migration instead.
var BASE_SCHEMA = /* sql */ "\nCREATE EXTENSION IF NOT EXISTS \"vector\";\n\nCREATE TABLE \"Project\" (\n    \"id\" TEXT NOT NULL,\n    \"name\" TEXT NOT NULL,\n    \"description\" TEXT,\n    \"createdAt\" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,\n    \"updatedAt\" TIMESTAMP(3) NOT NULL,\n    CONSTRAINT \"Project_pkey\" PRIMARY KEY (\"id\")\n);\n\nCREATE TABLE \"Agent\" (\n    \"id\" TEXT NOT NULL,\n    \"name\" TEXT NOT NULL,\n    \"projectId\" TEXT NOT NULL,\n    \"skills\" TEXT[],\n    CONSTRAINT \"Agent_pkey\" PRIMARY KEY (\"id\")\n);\n\nCREATE TABLE \"Session\" (\n    \"id\" TEXT NOT NULL,\n    \"agentId\" TEXT NOT NULL,\n    \"startedAt\" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,\n    \"endedAt\" TIMESTAMP(3),\n    CONSTRAINT \"Session_pkey\" PRIMARY KEY (\"id\")\n);\n\nCREATE TABLE \"Task\" (\n    \"id\" TEXT NOT NULL,\n    \"slug\" TEXT NOT NULL,\n    \"projectId\" TEXT NOT NULL,\n    \"title\" TEXT NOT NULL,\n    \"gitBranch\" TEXT NOT NULL DEFAULT 'main',\n    \"status\" TEXT NOT NULL,\n    \"createdAt\" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,\n    \"updatedAt\" TIMESTAMP(3) NOT NULL,\n    CONSTRAINT \"Task_pkey\" PRIMARY KEY (\"id\")\n);\n\nCREATE TABLE \"Decision\" (\n    \"id\" TEXT NOT NULL,\n    \"taskId\" TEXT NOT NULL,\n    \"gitBranch\" TEXT NOT NULL DEFAULT 'main',\n    \"context\" TEXT NOT NULL,\n    \"chosen\" TEXT NOT NULL,\n    \"rejected\" TEXT[],\n    \"reasoning\" TEXT NOT NULL,\n    \"filePath\" TEXT,\n    \"lineNumber\" INTEGER,\n    \"symbolName\" TEXT,\n    \"symbolType\" TEXT,\n    \"symbolRange\" TEXT,\n    \"issueRef\" TEXT,\n    \"createdAt\" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,\n    CONSTRAINT \"Decision_pkey\" PRIMARY KEY (\"id\")\n);\n\nCREATE TABLE \"Memory\" (\n    \"id\" TEXT NOT NULL,\n    \"projectId\" TEXT NOT NULL,\n    \"sessionId\" TEXT,\n    \"gitBranch\" TEXT NOT NULL DEFAULT 'main',\n    \"type\" TEXT NOT NULL,\n    \"content\" TEXT NOT NULL,\n    \"embedding\" vector(1536),\n    \"filePath\" TEXT,\n    \"lineNumber\" INTEGER,\n    \"symbolName\" TEXT,\n    \"symbolType\" TEXT,\n    \"symbolRange\" TEXT,\n    \"issueRef\" TEXT,\n    \"createdAt\" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,\n    CONSTRAINT \"Memory_pkey\" PRIMARY KEY (\"id\")\n);\n\nCREATE TABLE \"HealingEvent\" (\n    \"id\" TEXT NOT NULL,\n    \"projectId\" TEXT NOT NULL,\n    \"trigger\" TEXT NOT NULL,\n    \"source\" TEXT NOT NULL,\n    \"diagnosis\" TEXT NOT NULL,\n    \"filePath\" TEXT,\n    \"symbolName\" TEXT,\n    \"strategy\" TEXT NOT NULL,\n    \"patch\" TEXT,\n    \"status\" TEXT NOT NULL DEFAULT 'PENDING',\n    \"gitBranch\" TEXT NOT NULL DEFAULT 'main',\n    \"createdAt\" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,\n    CONSTRAINT \"HealingEvent_pkey\" PRIMARY KEY (\"id\")\n);\n\nCREATE TABLE \"SwarmSession\" (\n    \"id\" TEXT NOT NULL,\n    \"projectId\" TEXT NOT NULL,\n    \"goal\" TEXT NOT NULL,\n    \"status\" TEXT NOT NULL DEFAULT 'PENDING',\n    \"gitBranch\" TEXT NOT NULL DEFAULT 'main',\n    \"currentTurn\" INTEGER NOT NULL DEFAULT 0,\n    \"totalTurns\" INTEGER NOT NULL DEFAULT 0,\n    \"createdAt\" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,\n    \"updatedAt\" TIMESTAMP(3) NOT NULL,\n    CONSTRAINT \"SwarmSession_pkey\" PRIMARY KEY (\"id\")\n);\n\nCREATE TABLE \"SwarmAgent\" (\n    \"id\" TEXT NOT NULL,\n    \"swarmId\" TEXT NOT NULL,\n    \"role\" TEXT NOT NULL,\n    \"agentName\" TEXT NOT NULL,\n    \"status\" TEXT NOT NULL DEFAULT 'IDLE',\n    \"taskSlug\" TEXT,\n    \"turnOrder\" INTEGER NOT NULL DEFAULT 0,\n    \"joinedAt\" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,\n    CONSTRAINT \"SwarmAgent_pkey\" PRIMARY KEY (\"id\")\n);\n\nCREATE TABLE \"SwarmMessage\" (\n    \"id\" TEXT NOT NULL,\n    \"swarmId\" TEXT NOT NULL,\n    \"fromAgentId\" TEXT NOT NULL,\n    \"type\" TEXT NOT NULL,\n    \"channel\" TEXT NOT NULL,\n    \"payload\" TEXT NOT NULL,\n    \"isConflict\" BOOLEAN NOT NULL DEFAULT false,\n    \"resolved\" BOOLEAN NOT NULL DEFAULT false,\n    \"resolution\" TEXT,\n    \"createdAt\" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,\n    CONSTRAINT \"SwarmMessage_pkey\" PRIMARY KEY (\"id\")\n);\n\nCREATE UNIQUE INDEX \"Project_name_key\" ON \"Project\"(\"name\");\nCREATE UNIQUE INDEX \"Task_slug_key\" ON \"Task\"(\"slug\");\n\nALTER TABLE \"Agent\" ADD CONSTRAINT \"Agent_projectId_fkey\" FOREIGN KEY (\"projectId\") REFERENCES \"Project\"(\"id\") ON DELETE RESTRICT ON UPDATE CASCADE;\nALTER TABLE \"SwarmSession\" ADD CONSTRAINT \"SwarmSession_projectId_fkey\" FOREIGN KEY (\"projectId\") REFERENCES \"Project\"(\"id\") ON DELETE RESTRICT ON UPDATE CASCADE;\nALTER TABLE \"SwarmAgent\" ADD CONSTRAINT \"SwarmAgent_swarmId_fkey\" FOREIGN KEY (\"swarmId\") REFERENCES \"SwarmSession\"(\"id\") ON DELETE CASCADE ON UPDATE CASCADE;\nALTER TABLE \"SwarmMessage\" ADD CONSTRAINT \"SwarmMessage_swarmId_fkey\" FOREIGN KEY (\"swarmId\") REFERENCES \"SwarmSession\"(\"id\") ON DELETE CASCADE ON UPDATE CASCADE;\nALTER TABLE \"SwarmMessage\" ADD CONSTRAINT \"SwarmMessage_fromAgentId_fkey\" FOREIGN KEY (\"fromAgentId\") REFERENCES \"SwarmAgent\"(\"id\") ON DELETE CASCADE ON UPDATE CASCADE;\nALTER TABLE \"Session\" ADD CONSTRAINT \"Session_agentId_fkey\" FOREIGN KEY (\"agentId\") REFERENCES \"Agent\"(\"id\") ON DELETE RESTRICT ON UPDATE CASCADE;\nALTER TABLE \"Task\" ADD CONSTRAINT \"Task_projectId_fkey\" FOREIGN KEY (\"projectId\") REFERENCES \"Project\"(\"id\") ON DELETE RESTRICT ON UPDATE CASCADE;\nALTER TABLE \"Decision\" ADD CONSTRAINT \"Decision_taskId_fkey\" FOREIGN KEY (\"taskId\") REFERENCES \"Task\"(\"id\") ON DELETE RESTRICT ON UPDATE CASCADE;\nALTER TABLE \"Memory\" ADD CONSTRAINT \"Memory_projectId_fkey\" FOREIGN KEY (\"projectId\") REFERENCES \"Project\"(\"id\") ON DELETE RESTRICT ON UPDATE CASCADE;\nALTER TABLE \"Memory\" ADD CONSTRAINT \"Memory_sessionId_fkey\" FOREIGN KEY (\"sessionId\") REFERENCES \"Session\"(\"id\") ON DELETE SET NULL ON UPDATE CASCADE;\nALTER TABLE \"HealingEvent\" ADD CONSTRAINT \"HealingEvent_projectId_fkey\" FOREIGN KEY (\"projectId\") REFERENCES \"Project\"(\"id\") ON DELETE RESTRICT ON UPDATE CASCADE;\n";
var MIGRATIONS = [
    // v1–v12: All these columns are already in BASE_SCHEMA for new DBs.
    // They remain here for safe upgrade of instances created before the base schema was unified.
    {
        version: 1,
        description: 'Add AST anchor columns to Memory',
        sql: "\n            ALTER TABLE \"Memory\" ADD COLUMN IF NOT EXISTS \"filePath\" TEXT;\n            ALTER TABLE \"Memory\" ADD COLUMN IF NOT EXISTS \"lineNumber\" INTEGER;\n            ALTER TABLE \"Memory\" ADD COLUMN IF NOT EXISTS \"symbolName\" TEXT;\n            ALTER TABLE \"Memory\" ADD COLUMN IF NOT EXISTS \"symbolType\" TEXT;\n            ALTER TABLE \"Memory\" ADD COLUMN IF NOT EXISTS \"symbolRange\" TEXT;\n            ALTER TABLE \"Memory\" ADD COLUMN IF NOT EXISTS \"issueRef\" TEXT;\n        ",
    },
    {
        version: 2,
        description: 'Add AST anchor columns to Decision',
        sql: "\n            ALTER TABLE \"Decision\" ADD COLUMN IF NOT EXISTS \"filePath\" TEXT;\n            ALTER TABLE \"Decision\" ADD COLUMN IF NOT EXISTS \"lineNumber\" INTEGER;\n            ALTER TABLE \"Decision\" ADD COLUMN IF NOT EXISTS \"symbolName\" TEXT;\n            ALTER TABLE \"Decision\" ADD COLUMN IF NOT EXISTS \"symbolType\" TEXT;\n            ALTER TABLE \"Decision\" ADD COLUMN IF NOT EXISTS \"symbolRange\" TEXT;\n            ALTER TABLE \"Decision\" ADD COLUMN IF NOT EXISTS \"issueRef\" TEXT;\n        ",
    },
    {
        version: 3,
        description: 'Create HealingEvent table',
        sql: "\n            CREATE TABLE IF NOT EXISTS \"HealingEvent\" (\n                \"id\" TEXT NOT NULL,\n                \"projectId\" TEXT NOT NULL,\n                \"trigger\" TEXT NOT NULL,\n                \"source\" TEXT NOT NULL,\n                \"diagnosis\" TEXT NOT NULL,\n                \"filePath\" TEXT,\n                \"symbolName\" TEXT,\n                \"strategy\" TEXT NOT NULL,\n                \"patch\" TEXT,\n                \"status\" TEXT NOT NULL DEFAULT 'PENDING',\n                \"gitBranch\" TEXT NOT NULL DEFAULT 'main',\n                \"createdAt\" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,\n                CONSTRAINT \"HealingEvent_pkey\" PRIMARY KEY (\"id\")\n            );\n            ALTER TABLE \"HealingEvent\"\n                ADD CONSTRAINT \"HealingEvent_projectId_fkey\"\n                FOREIGN KEY (\"projectId\") REFERENCES \"Project\"(\"id\")\n                ON DELETE RESTRICT ON UPDATE CASCADE\n                NOT VALID;\n        ",
    },
    {
        version: 4,
        description: 'Create Swarm tables',
        sql: "\n            CREATE TABLE IF NOT EXISTS \"SwarmSession\" (\n                \"id\" TEXT NOT NULL,\n                \"projectId\" TEXT NOT NULL,\n                \"goal\" TEXT NOT NULL,\n                \"status\" TEXT NOT NULL DEFAULT 'PENDING',\n                \"gitBranch\" TEXT NOT NULL DEFAULT 'main',\n                \"currentTurn\" INTEGER NOT NULL DEFAULT 0,\n                \"totalTurns\" INTEGER NOT NULL DEFAULT 0,\n                \"createdAt\" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,\n                \"updatedAt\" TIMESTAMP(3) NOT NULL,\n                CONSTRAINT \"SwarmSession_pkey\" PRIMARY KEY (\"id\")\n            );\n\n            CREATE TABLE IF NOT EXISTS \"SwarmAgent\" (\n                \"id\" TEXT NOT NULL,\n                \"swarmId\" TEXT NOT NULL,\n                \"role\" TEXT NOT NULL,\n                \"agentName\" TEXT NOT NULL,\n                \"status\" TEXT NOT NULL DEFAULT 'IDLE',\n                \"taskSlug\" TEXT,\n                \"turnOrder\" INTEGER NOT NULL DEFAULT 0,\n                \"joinedAt\" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,\n                CONSTRAINT \"SwarmAgent_pkey\" PRIMARY KEY (\"id\")\n            );\n\n            CREATE TABLE IF NOT EXISTS \"SwarmMessage\" (\n                \"id\" TEXT NOT NULL,\n                \"swarmId\" TEXT NOT NULL,\n                \"fromAgentId\" TEXT NOT NULL,\n                \"type\" TEXT NOT NULL,\n                \"channel\" TEXT NOT NULL,\n                \"payload\" TEXT NOT NULL,\n                \"isConflict\" BOOLEAN NOT NULL DEFAULT false,\n                \"resolved\" BOOLEAN NOT NULL DEFAULT false,\n                \"resolution\" TEXT,\n                \"createdAt\" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,\n                CONSTRAINT \"SwarmMessage_pkey\" PRIMARY KEY (\"id\")\n            );\n\n            ALTER TABLE \"SwarmSession\" ADD CONSTRAINT \"SwarmSession_projectId_fkey\" FOREIGN KEY (\"projectId\") REFERENCES \"Project\"(\"id\") ON DELETE RESTRICT ON UPDATE CASCADE;\n            ALTER TABLE \"SwarmAgent\" ADD CONSTRAINT \"SwarmAgent_swarmId_fkey\" FOREIGN KEY (\"swarmId\") REFERENCES \"SwarmSession\"(\"id\") ON DELETE CASCADE ON UPDATE CASCADE;\n            ALTER TABLE \"SwarmMessage\" ADD CONSTRAINT \"SwarmMessage_swarmId_fkey\" FOREIGN KEY (\"swarmId\") REFERENCES \"SwarmSession\"(\"id\") ON DELETE CASCADE ON UPDATE CASCADE;\n            ALTER TABLE \"SwarmMessage\" ADD CONSTRAINT \"SwarmMessage_fromAgentId_fkey\" FOREIGN KEY (\"fromAgentId\") REFERENCES \"SwarmAgent\"(\"id\") ON DELETE CASCADE ON UPDATE CASCADE;\n        ",
    },
    // ── Add future migrations below ───────────────────────────────────────────
    // Template:
    // {
    //     version: 5,
    //     description: 'Your human-readable description',
    //     sql: `ALTER TABLE "Foo" ADD COLUMN IF NOT EXISTS "bar" TEXT;`,
    // },
];
// ── Migration runner ──────────────────────────────────────────────────────────
function ensureMigrationTable() {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, exports.client.exec("\n        CREATE TABLE IF NOT EXISTS \"__aigit_migrations\" (\n            \"version\" INTEGER NOT NULL,\n            \"description\" TEXT NOT NULL,\n            \"applied_at\" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,\n            CONSTRAINT \"__aigit_migrations_pkey\" PRIMARY KEY (\"version\")\n        );\n    ")];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
function getAppliedVersions() {
    return __awaiter(this, void 0, void 0, function () {
        var result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, exports.client.query('SELECT version FROM "__aigit_migrations"')];
                case 1:
                    result = _a.sent();
                    return [2 /*return*/, new Set(result.rows.map(function (r) { return r.version; }))];
            }
        });
    });
}
function applyMigrations() {
    return __awaiter(this, void 0, void 0, function () {
        var applied, pending, _i, pending_1, migration, err_1;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, ensureMigrationTable()];
                case 1:
                    _b.sent();
                    return [4 /*yield*/, getAppliedVersions()];
                case 2:
                    applied = _b.sent();
                    pending = MIGRATIONS.filter(function (m) { return !applied.has(m.version); }).sort(function (a, b) { return a.version - b.version; });
                    _i = 0, pending_1 = pending;
                    _b.label = 3;
                case 3:
                    if (!(_i < pending_1.length)) return [3 /*break*/, 12];
                    migration = pending_1[_i];
                    _b.label = 4;
                case 4:
                    _b.trys.push([4, 7, , 11]);
                    return [4 /*yield*/, exports.client.exec(migration.sql)];
                case 5:
                    _b.sent();
                    return [4 /*yield*/, exports.client.query("INSERT INTO \"__aigit_migrations\" (version, description) VALUES ($1, $2)", [migration.version, migration.description])];
                case 6:
                    _b.sent();
                    console.error("[aigit] Migration v".concat(migration.version, " applied: ").concat(migration.description));
                    return [3 /*break*/, 11];
                case 7:
                    err_1 = _b.sent();
                    if (!((_a = err_1.message) === null || _a === void 0 ? void 0 : _a.includes('already exists'))) return [3 /*break*/, 9];
                    return [4 /*yield*/, exports.client.query("INSERT INTO \"__aigit_migrations\" (version, description) VALUES ($1, $2) ON CONFLICT DO NOTHING", [migration.version, migration.description])];
                case 8:
                    _b.sent();
                    return [3 /*break*/, 10];
                case 9:
                    console.error("[aigit] Migration v".concat(migration.version, " failed: ").concat(err_1.message));
                    _b.label = 10;
                case 10: return [3 /*break*/, 11];
                case 11:
                    _i++;
                    return [3 /*break*/, 3];
                case 12: return [2 /*return*/];
            }
        });
    });
}
// ── Database initializer (called once at startup) ─────────────────────────────
function initializeDatabase() {
    return __awaiter(this, void 0, void 0, function () {
        var result, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 5, , 6]);
                    return [4 /*yield*/, exports.client.query("\n            SELECT EXISTS (\n                SELECT FROM information_schema.tables\n                WHERE table_schema = 'public'\n                AND table_name = 'Project'\n            );\n        ")];
                case 1:
                    result = _a.sent();
                    if (!!result.rows[0].exists) return [3 /*break*/, 3];
                    console.error('[aigit] Fresh database detected — applying base schema...');
                    return [4 /*yield*/, exports.client.exec(BASE_SCHEMA)];
                case 2:
                    _a.sent();
                    _a.label = 3;
                case 3:
                // Always run incremental migrations (idempotent — skips already-applied ones)
                return [4 /*yield*/, applyMigrations()];
                case 4:
                    // Always run incremental migrations (idempotent — skips already-applied ones)
                    _a.sent();
                    return [3 /*break*/, 6];
                case 5:
                    error_1 = _a.sent();
                    console.error('[aigit] Error initializing database:', error_1);
                    return [3 /*break*/, 6];
                case 6: return [2 /*return*/];
            }
        });
    });
}
