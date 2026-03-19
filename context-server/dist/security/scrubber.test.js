"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const scrubber_1 = require("./scrubber");
(0, vitest_1.describe)('redactSecrets', () => {
    (0, vitest_1.it)('redacts AWS keys', () => {
        const text = 'My key is AKIA1234567890ABCDEF';
        (0, vitest_1.expect)((0, scrubber_1.redactSecrets)(text)).toBe('My key is [REDACTED]');
    });
    (0, vitest_1.it)('redacts GitHub tokens', () => {
        const text = 'Token: ghp_123456789012345678901234567890123456';
        (0, vitest_1.expect)((0, scrubber_1.redactSecrets)(text)).toBe('Token: [REDACTED]');
    });
    (0, vitest_1.it)('redacts emails', () => {
        const text = 'Contact me at test@example.com';
        (0, vitest_1.expect)((0, scrubber_1.redactSecrets)(text)).toBe('Contact me at [REDACTED]');
    });
    (0, vitest_1.it)('redacts JWTs', () => {
        const text = 'Session: eyJhbGci.eyJzdWIi.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
        (0, vitest_1.expect)((0, scrubber_1.redactSecrets)(text)).toBe('Session: [REDACTED]');
    });
    (0, vitest_1.it)('redacts generic secrets', () => {
        const text = 'api_key: "secret-value-123"';
        (0, vitest_1.expect)((0, scrubber_1.redactSecrets)(text)).toBe('api_key: "[REDACTED]"');
        const text2 = 'password=my-password-123';
        (0, vitest_1.expect)((0, scrubber_1.redactSecrets)(text2)).toBe('password=[REDACTED]');
    });
    (0, vitest_1.it)('returns empty string/null/undefined as is', () => {
        (0, vitest_1.expect)((0, scrubber_1.redactSecrets)('')).toBe('');
        (0, vitest_1.expect)((0, scrubber_1.redactSecrets)(null)).toBe(null);
        (0, vitest_1.expect)((0, scrubber_1.redactSecrets)(undefined)).toBe(undefined);
    });
    (0, vitest_1.it)('does not redact non-secrets', () => {
        const text = 'This is a normal sentence without any secrets.';
        (0, vitest_1.expect)((0, scrubber_1.redactSecrets)(text)).toBe(text);
    });
});
(0, vitest_1.describe)('sanitizeDecision', () => {
    (0, vitest_1.it)('redacts secrets in summary, justification, and alternatives', () => {
        const decision = {
            summary: 'Using key AKIA1234567890ABCDEF',
            justification: 'Found at test@example.com',
            alternatives: 'Try password: "secret-password"',
            otherField: 'Keep this'
        };
        const sanitized = (0, scrubber_1.sanitizeDecision)(decision);
        (0, vitest_1.expect)(sanitized.summary).toBe('Using key [REDACTED]');
        (0, vitest_1.expect)(sanitized.justification).toBe('Found at [REDACTED]');
        (0, vitest_1.expect)(sanitized.alternatives).toBe('Try password: "[REDACTED]"');
        (0, vitest_1.expect)(sanitized.otherField).toBe('Keep this');
    });
    (0, vitest_1.it)('handles missing optional fields', () => {
        const decision = {
            summary: 'No secrets here'
        };
        const sanitized = (0, scrubber_1.sanitizeDecision)(decision);
        (0, vitest_1.expect)(sanitized.summary).toBe('No secrets here');
        (0, vitest_1.expect)(sanitized.justification).toBeUndefined();
    });
    (0, vitest_1.it)('returns null/undefined as is', () => {
        (0, vitest_1.expect)((0, scrubber_1.sanitizeDecision)(null)).toBe(null);
        (0, vitest_1.expect)((0, scrubber_1.sanitizeDecision)(undefined)).toBe(undefined);
    });
    (0, vitest_1.it)('does not mutate the original object', () => {
        const decision = {
            summary: 'Using key AKIA1234567890ABCDEF',
        };
        const sanitized = (0, scrubber_1.sanitizeDecision)(decision);
        (0, vitest_1.expect)(sanitized.summary).toBe('Using key [REDACTED]');
        (0, vitest_1.expect)(decision.summary).toBe('Using key AKIA1234567890ABCDEF');
        (0, vitest_1.expect)(sanitized).not.toBe(decision);
    });
});
(0, vitest_1.describe)('sanitizeMemory', () => {
    (0, vitest_1.it)('returns a copy of the memory object', () => {
        const memory = { id: 1, content: 'some content' };
        const sanitized = (0, scrubber_1.sanitizeMemory)(memory);
        (0, vitest_1.expect)(sanitized).toEqual(memory);
        (0, vitest_1.expect)(sanitized).not.toBe(memory);
    });
    (0, vitest_1.it)('returns null/undefined as is', () => {
        (0, vitest_1.expect)((0, scrubber_1.sanitizeMemory)(null)).toBe(null);
        (0, vitest_1.expect)((0, scrubber_1.sanitizeMemory)(undefined)).toBe(undefined);
    });
});
