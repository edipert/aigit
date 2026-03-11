"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const docs_1 = require("../docs");
const handler = async ({ args }) => {
    const outIdx = args.indexOf('--out');
    const out = outIdx !== -1 ? args[outIdx + 1] : undefined;
    await (0, docs_1.exportDocs)({ out });
};
exports.default = handler;
