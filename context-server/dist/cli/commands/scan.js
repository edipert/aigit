"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const registry_1 = require("../../agents/registry");
const handler = async ({ workspacePath }) => {
    const agents = (0, registry_1.detectAgents)(workspacePath);
    (0, registry_1.printScanReport)(agents);
};
exports.default = handler;
