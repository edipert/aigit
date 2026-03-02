"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildHealingPlan = buildHealingPlan;
exports.formatHealReport = formatHealReport;
exports.formatHealPayload = formatHealPayload;
/**
 * Build a structured healing plan from a diagnosis.
 * This plan is designed to be consumed by an AI agent (via MCP)
 * or displayed to a human developer (via CLI).
 */
function buildHealingPlan(diagnosis) {
    const targets = diagnosis.failures.map(f => ({
        file: f.filePath,
        line: f.lineNumber,
        symbol: null,
        error: f.errorMessage,
        testName: f.testName,
    }));
    // Link symbols to targets
    for (const target of targets) {
        if (!target.file)
            continue;
        const match = diagnosis.symbols.find(s => s.file === target.file);
        if (match)
            target.symbol = match.name;
    }
    // Build context brief from memories + decisions
    const memBrief = diagnosis.relatedMemories
        .slice(0, 5)
        .map(m => `[${m.type.toUpperCase()}] ${m.content}`)
        .join('\n');
    const decBrief = diagnosis.relatedDecisions
        .slice(0, 5)
        .map(d => `[DECISION] ${d.context} → ${d.chosen}`)
        .join('\n');
    const contextBrief = [memBrief, decBrief].filter(Boolean).join('\n') || 'No prior context found.';
    // Generate suggested actions
    const suggestedActions = [];
    if (diagnosis.symbols.length > 0) {
        suggestedActions.push(`Inspect ${diagnosis.symbols.length} linked symbol(s): ${diagnosis.symbols.map(s => `@${s.name}`).join(', ')}`);
    }
    if (diagnosis.relatedDecisions.length > 0) {
        suggestedActions.push(`Review ${diagnosis.relatedDecisions.length} past decision(s) for conflict with current implementation`);
    }
    for (const target of targets) {
        if (target.file && target.line) {
            suggestedActions.push(`Fix ${target.error} at ${target.file}:${target.line}`);
        }
        else if (target.file) {
            suggestedActions.push(`Fix ${target.error} in ${target.file}`);
        }
        else {
            suggestedActions.push(`Investigate: ${target.error}`);
        }
    }
    return {
        summary: diagnosis.summary,
        failureCount: diagnosis.failures.length,
        targets,
        contextBrief,
        suggestedActions,
    };
}
/**
 * Format a healing plan as a CLI-friendly report.
 */
function formatHealReport(plan) {
    let report = `\n🩹 [aigit heal] Diagnosis Report\n`;
    report += `${'─'.repeat(50)}\n`;
    report += `${plan.summary}\n\n`;
    if (plan.targets.length > 0) {
        report += `📍 Failure Targets:\n`;
        for (const t of plan.targets) {
            const loc = t.file ? `${t.file}${t.line ? `:${t.line}` : ''}` : 'unknown location';
            const sym = t.symbol ? ` ⚓ @${t.symbol}` : '';
            report += `  ✕ [${t.testName}] ${t.error}\n    📁 ${loc}${sym}\n`;
        }
        report += '\n';
    }
    if (plan.contextBrief && plan.contextBrief !== 'No prior context found.') {
        report += `🧠 Related Context:\n`;
        for (const line of plan.contextBrief.split('\n')) {
            report += `  ${line}\n`;
        }
        report += '\n';
    }
    if (plan.suggestedActions.length > 0) {
        report += `💡 Suggested Actions:\n`;
        for (let i = 0; i < plan.suggestedActions.length; i++) {
            report += `  ${i + 1}. ${plan.suggestedActions[i]}\n`;
        }
        report += '\n';
    }
    return report;
}
/**
 * Format a healing plan as a structured JSON payload (for MCP consumption).
 */
function formatHealPayload(plan) {
    return JSON.stringify(plan, null, 2);
}
