"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.redactSecrets = redactSecrets;
exports.sanitizeMemory = sanitizeMemory;
exports.sanitizeDecision = sanitizeDecision;
/**
 * Regex patterns for finding potential secrets and PII.
 * These are simple heuristics to catch common mistakes.
 */
const PATTERNS = {
    AWS_KEY: /(?:AKIA|ABIA|ACCA|ASIA)[0-9A-Z]{16}/g,
    STRIPE_KEY: /(?:sk_live_|pk_live_|sk_test_|pk_test_)[a-zA-Z0-9]{24,}/g,
    GITHUB_TOKEN: /(?:ghp|gho|ghu|ghs|ghr)_[a-zA-Z0-9]{36}/g,
    JWT: /eyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g,
    EMAIL: /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/g,
    BEARER_TOKEN: /Bearer\s+[a-zA-Z0-9\-._~+/]+/g,
    GENERIC_SECRET: /(?:api_key|secret|password|token)\s*[:=]\s*["']?([a-zA-Z0-9\-_]{8,})["']?/gi,
};
const REDACTED = '[REDACTED]';
function redactSecrets(text) {
    if (!text)
        return text;
    let sanitized = text;
    // Replace direct pattern matches
    sanitized = sanitized.replace(PATTERNS.AWS_KEY, REDACTED);
    sanitized = sanitized.replace(PATTERNS.STRIPE_KEY, REDACTED);
    sanitized = sanitized.replace(PATTERNS.GITHUB_TOKEN, REDACTED);
    sanitized = sanitized.replace(PATTERNS.JWT, REDACTED);
    sanitized = sanitized.replace(PATTERNS.EMAIL, REDACTED);
    sanitized = sanitized.replace(PATTERNS.BEARER_TOKEN, REDACTED);
    // For generic secrets, we want to keep the "key=" part but scrub the value
    sanitized = sanitized.replace(PATTERNS.GENERIC_SECRET, (match, p1) => {
        // Find the position of the secret within the overall match and replace just the secret
        const idx = match.lastIndexOf(p1);
        if (idx !== -1) {
            return match.substring(0, idx) + REDACTED + match.substring(idx + p1.length);
        }
        return match.replace(p1, REDACTED);
    });
    return sanitized;
}
function sanitizeMemory(memory) {
    if (!memory)
        return memory;
    // Create a copy so we don't mutate DB instances directly (if applicable)
    const sanitized = { ...memory };
    return sanitized;
}
function sanitizeDecision(decision) {
    if (!decision)
        return decision;
    const sanitized = { ...decision };
    if (sanitized.summary) {
        sanitized.summary = redactSecrets(sanitized.summary);
    }
    if (sanitized.justification) {
        sanitized.justification = redactSecrets(sanitized.justification);
    }
    if (sanitized.alternatives) {
        sanitized.alternatives = redactSecrets(sanitized.alternatives);
    }
    return sanitized;
}
