import { describe, it, expect } from 'vitest';
import { redactSecrets, sanitizeDecision, sanitizeMemory } from './scrubber';

describe('redactSecrets', () => {
    it('redacts AWS keys', () => {
        const text = 'My key is AKIA1234567890ABCDEF';
        expect(redactSecrets(text)).toBe('My key is [REDACTED]');
    });

    it('redacts GitHub tokens', () => {
        const text = 'Token: ghp_123456789012345678901234567890123456';
        expect(redactSecrets(text)).toBe('Token: [REDACTED]');
    });

    it('redacts emails', () => {
        const text = 'Contact me at test@example.com';
        expect(redactSecrets(text)).toBe('Contact me at [REDACTED]');
    });

    it('redacts JWTs', () => {
        const text = 'Session: eyJhbGci.eyJzdWIi.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
        expect(redactSecrets(text)).toBe('Session: [REDACTED]');
    });

    it('redacts generic secrets', () => {
        const text = 'api_key: "secret-value-123"';
        expect(redactSecrets(text)).toBe('api_key: "[REDACTED]"');

        const text2 = 'password=my-password-123';
        expect(redactSecrets(text2)).toBe('password=[REDACTED]');
    });

    it('returns empty string/null/undefined as is', () => {
        expect(redactSecrets('')).toBe('');
        expect(redactSecrets(null as any)).toBe(null);
        expect(redactSecrets(undefined as any)).toBe(undefined);
    });

    it('does not redact non-secrets', () => {
        const text = 'This is a normal sentence without any secrets.';
        expect(redactSecrets(text)).toBe(text);
    });
});

describe('sanitizeDecision', () => {
    it('redacts secrets in context, chosen, reasoning, and rejected', () => {
        const decision = {
            context: 'Using key AKIA1234567890ABCDEF',
            chosen: 'Found at test@example.com',
            reasoning: 'Because of api_key: "secret-password"',
            rejected: ['Try password: "secret-password"'],
            otherField: 'Keep this'
        };
        const sanitized = sanitizeDecision(decision);
        expect(sanitized.context).toBe('Using key [REDACTED]');
        expect(sanitized.chosen).toBe('Found at [REDACTED]');
        expect(sanitized.reasoning).toBe('Because of api_key: "[REDACTED]"');
        expect(sanitized.rejected[0]).toBe('Try password: "[REDACTED]"');
        expect(sanitized.otherField).toBe('Keep this');
    });

    it('handles missing optional fields', () => {
        const decision = {
            context: 'No secrets here'
        };
        const sanitized = sanitizeDecision(decision);
        expect(sanitized.context).toBe('No secrets here');
        expect(sanitized.chosen).toBeUndefined();
        expect(sanitized.rejected).toBeUndefined();
    });

    it('returns null/undefined as is', () => {
        expect(sanitizeDecision(null)).toBe(null);
        expect(sanitizeDecision(undefined)).toBe(undefined);
    });

    it('does not mutate the original object', () => {
        const decision = {
            context: 'Using key AKIA1234567890ABCDEF',
        };
        const sanitized = sanitizeDecision(decision);
        expect(sanitized.context).toBe('Using key [REDACTED]');
        expect(decision.context).toBe('Using key AKIA1234567890ABCDEF');
        expect(sanitized).not.toBe(decision);
    });
});

describe('sanitizeMemory', () => {
    it('returns a copy of the memory object', () => {
        const memory = { id: 1, content: 'some content' };
        const sanitized = sanitizeMemory(memory);
        expect(sanitized).toEqual(memory);
        expect(sanitized).not.toBe(memory);
    });

    it('redacts secrets in content', () => {
        const memory = { id: 2, content: 'Using key AKIA1234567890ABCDEF in my script' };
        const sanitized = sanitizeMemory(memory);
        expect(sanitized.content).toBe('Using key [REDACTED] in my script');
    });

    it('returns null/undefined as is', () => {
        expect(sanitizeMemory(null)).toBe(null);
        expect(sanitizeMemory(undefined)).toBe(undefined);
    });
});
