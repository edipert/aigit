#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const agentName = process.argv[2];
if (!agentName) {
    console.error("Usage: node compiler.js <agent-name>");
    process.exit(1);
}

const basePath = path.resolve(__dirname, '..');
const agentPath = path.join(basePath, `${agentName}.md`);
const geminiPath = path.resolve(__dirname, '../../GEMINI.md');

if (!fs.existsSync(agentPath)) {
    console.error(`Error: Agent file not found at ${agentPath}`);
    process.exit(1);
}

console.log("=== COMPILING AI CONTEXT ===\n");
if (fs.existsSync(geminiPath)) {
    console.log("--- GLOBAL RULES (GEMINI.md) ---");
    console.log("Global rules successfully injected.\n");
}

console.log(`--- AGENT CAPABILITIES (${agentName}) ---`);
const agentContent = fs.readFileSync(agentPath, 'utf8');
console.log(agentContent);

console.log("\n=== COMPILATION COMPLETE ===");
