"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const hydration_1 = require("../hydration");
const db_1 = require("../../db");
const handler = async ({ args }) => {
    const workspacePath = (0, db_1.findWorkspaceRoot)(process.cwd());
    const activeFile = args[0];
    const context = await (0, hydration_1.compileHydratedContext)(workspacePath, activeFile);
    console.log(context);
};
exports.default = handler;
