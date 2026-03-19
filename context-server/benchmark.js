"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
Object.defineProperty(exports, "__esModule", { value: true });
var db_1 = require("./src/db");
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var project, projectId, src, tgt, numMemories, numTasks, numDecisionsPerTask, memoryData, tasksData, srcTasks, decisionsData, existingMemoriesData, existingTasksData, start, _a, memories, decisions, tasks, ported, existingMemories, existingContentSet_1, newMemoriesData, existingTasks, existingSlugSet_1, newTasks, _loop_1, _i, newTasks_1, t, end;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, (0, db_1.initializeDatabase)()];
                case 1:
                    _b.sent();
                    // Clean up previous runs
                    return [4 /*yield*/, db_1.prisma.decision.deleteMany()];
                case 2:
                    // Clean up previous runs
                    _b.sent();
                    return [4 /*yield*/, db_1.prisma.memory.deleteMany()];
                case 3:
                    _b.sent();
                    return [4 /*yield*/, db_1.prisma.task.deleteMany()];
                case 4:
                    _b.sent();
                    return [4 /*yield*/, db_1.prisma.project.deleteMany()];
                case 5:
                    _b.sent();
                    return [4 /*yield*/, db_1.prisma.project.create({
                            data: {
                                name: 'benchmark_project',
                                description: 'A project to benchmark merge_context performance'
                            }
                        })];
                case 6:
                    project = _b.sent();
                    projectId = project.id;
                    src = 'src-branch';
                    tgt = 'tgt-branch';
                    console.log('Generating dummy data...');
                    numMemories = 500;
                    numTasks = 200;
                    numDecisionsPerTask = 5;
                    memoryData = Array.from({ length: numMemories }, function (_, i) { return ({
                        projectId: projectId,
                        gitBranch: src,
                        type: 'human_note',
                        content: "Dummy memory ".concat(i),
                    }); });
                    return [4 /*yield*/, db_1.prisma.memory.createMany({ data: memoryData })];
                case 7:
                    _b.sent();
                    tasksData = Array.from({ length: numTasks }, function (_, i) { return ({
                        projectId: projectId,
                        gitBranch: src,
                        slug: "dummy-task-".concat(i, "-src"),
                        title: "Dummy Task ".concat(i),
                        status: 'PLANNING'
                    }); });
                    return [4 /*yield*/, db_1.prisma.task.createMany({ data: tasksData })];
                case 8:
                    _b.sent();
                    return [4 /*yield*/, db_1.prisma.task.findMany({ where: { gitBranch: src } })];
                case 9:
                    srcTasks = _b.sent();
                    decisionsData = srcTasks.flatMap(function (t) {
                        return Array.from({ length: numDecisionsPerTask }, function (_, i) { return ({
                            taskId: t.id,
                            gitBranch: src,
                            context: "Context ".concat(i, " for task ").concat(t.slug),
                            chosen: "Chosen ".concat(i),
                            reasoning: "Reasoning ".concat(i),
                        }); });
                    });
                    return [4 /*yield*/, db_1.prisma.decision.createMany({ data: decisionsData })];
                case 10:
                    _b.sent();
                    console.log("Created ".concat(numMemories, " memories, ").concat(numTasks, " tasks, ").concat(srcTasks.length * numDecisionsPerTask, " decisions on ").concat(src, "."));
                    existingMemoriesData = memoryData.slice(0, 100).map(function (m) { return (__assign(__assign({}, m), { gitBranch: tgt })); });
                    return [4 /*yield*/, db_1.prisma.memory.createMany({ data: existingMemoriesData })];
                case 11:
                    _b.sent();
                    existingTasksData = tasksData.slice(0, 50).map(function (t) { return (__assign(__assign({}, t), { gitBranch: tgt, slug: t.slug.replace('-src', '-tgt') })); });
                    return [4 /*yield*/, db_1.prisma.task.createMany({ data: existingTasksData })];
                case 12:
                    _b.sent();
                    console.log('Running merge_context benchmark...');
                    start = performance.now();
                    return [4 /*yield*/, Promise.all([
                            db_1.prisma.memory.findMany({ where: { projectId: projectId, gitBranch: src } }),
                            db_1.prisma.decision.findMany({ where: { task: { projectId: projectId }, gitBranch: src } }),
                            db_1.prisma.task.findMany({ where: { projectId: projectId, gitBranch: src } }),
                        ])];
                case 13:
                    _a = _b.sent(), memories = _a[0], decisions = _a[1], tasks = _a[2];
                    ported = 0;
                    if (!(memories.length > 0)) return [3 /*break*/, 16];
                    return [4 /*yield*/, db_1.prisma.memory.findMany({
                            where: { projectId: projectId, gitBranch: tgt },
                            select: { content: true }
                        })];
                case 14:
                    existingMemories = _b.sent();
                    existingContentSet_1 = new Set(existingMemories.map(function (m) { return m.content; }));
                    newMemoriesData = memories
                        .filter(function (m) { return !existingContentSet_1.has(m.content); })
                        .map(function (m) { return ({
                        projectId: m.projectId, gitBranch: tgt, type: m.type, content: m.content,
                        filePath: m.filePath, lineNumber: m.lineNumber,
                        symbolName: m.symbolName, symbolType: m.symbolType, symbolRange: m.symbolRange,
                    }); });
                    if (!(newMemoriesData.length > 0)) return [3 /*break*/, 16];
                    return [4 /*yield*/, db_1.prisma.memory.createMany({ data: newMemoriesData })];
                case 15:
                    _b.sent();
                    ported += newMemoriesData.length;
                    _b.label = 16;
                case 16:
                    if (!(tasks.length > 0)) return [3 /*break*/, 21];
                    return [4 /*yield*/, db_1.prisma.task.findMany({
                            where: { projectId: projectId, gitBranch: tgt },
                            select: { slug: true }
                        })];
                case 17:
                    existingTasks = _b.sent();
                    existingSlugSet_1 = new Set(existingTasks.map(function (t) { return t.slug; }));
                    newTasks = tasks.map(function (t) { return (__assign(__assign({}, t), { slug: t.slug.replace('-src', '-tgt') })); }).filter(function (t) { return !existingSlugSet_1.has(t.slug); });
                    if (!(newTasks.length > 0)) return [3 /*break*/, 21];
                    _loop_1 = function (t) {
                        var newTask, taskDecisions;
                        return __generator(this, function (_c) {
                            switch (_c.label) {
                                case 0: return [4 /*yield*/, db_1.prisma.task.create({
                                        data: {
                                            projectId: t.projectId, gitBranch: tgt, slug: t.slug, title: t.title, status: t.status,
                                        }
                                    })];
                                case 1:
                                    newTask = _c.sent();
                                    ported++;
                                    taskDecisions = decisions.filter(function (d) { return d.taskId === t.id; });
                                    if (!(taskDecisions.length > 0)) return [3 /*break*/, 3];
                                    return [4 /*yield*/, db_1.prisma.decision.createMany({
                                            data: taskDecisions.map(function (d) { return ({
                                                taskId: newTask.id, gitBranch: tgt, context: d.context, chosen: d.chosen,
                                                rejected: d.rejected, reasoning: d.reasoning,
                                                filePath: d.filePath, lineNumber: d.lineNumber,
                                                symbolName: d.symbolName, symbolType: d.symbolType, symbolRange: d.symbolRange,
                                            }); })
                                        })];
                                case 2:
                                    _c.sent();
                                    ported += taskDecisions.length;
                                    _c.label = 3;
                                case 3: return [2 /*return*/];
                            }
                        });
                    };
                    _i = 0, newTasks_1 = newTasks;
                    _b.label = 18;
                case 18:
                    if (!(_i < newTasks_1.length)) return [3 /*break*/, 21];
                    t = newTasks_1[_i];
                    return [5 /*yield**/, _loop_1(t)];
                case 19:
                    _b.sent();
                    _b.label = 20;
                case 20:
                    _i++;
                    return [3 /*break*/, 18];
                case 21:
                    end = performance.now();
                    console.log("Ported ".concat(ported, " entries."));
                    console.log("merge_context took ".concat((end - start).toFixed(2), " ms."));
                    return [2 /*return*/];
            }
        });
    });
}
main().catch(console.error);
