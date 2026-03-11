"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const storyteller_1 = require("../../agents/storyteller");
const handler = async ({ args }) => {
    const targetPath = args[0];
    if (!targetPath) {
        console.error('⚠️  Error: You must provide a file or directory path to replay.');
        console.log('Usage: aigit replay <path>');
        process.exit(1);
    }
    const timeline = await (0, storyteller_1.buildTimeline)(targetPath);
    const narrative = (0, storyteller_1.formatReplayNarrative)(targetPath, timeline);
    console.log(narrative);
};
exports.default = handler;
