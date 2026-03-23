import { describe, it, expect } from 'vitest';
import { embedText } from './embeddings';

describe('embedText', () => {
    it('should calculate word frequencies correctly for a standard string', () => {
        const text = "apple banana apple";
        // The implementation tokenizes to words > 2 chars, so both apple and banana are kept.
        // words: apple(2), banana(1) -> total 3 words
        // vocab sorted: apple, banana

        const result = embedText(text);

        expect(result.length).toBe(2);

        // apple -> 2 / 3
        expect(result[0]).toBeCloseTo(2 / 3);

        // banana -> 1 / 3
        expect(result[1]).toBeCloseTo(1 / 3);
    });

    it('should handle an empty string', () => {
        const text = "";
        const result = embedText(text);

        expect(result).toEqual([]); // no words, empty vocabulary
    });

    it('should handle strings with only punctuation', () => {
        const text = ", . ! ?";
        const result = embedText(text);

        expect(result).toEqual([]); // no valid words
    });

    it('should use provided vocabulary correctly', () => {
        const text = "apple banana apple";
        // tokenize words: apple(2), banana(1) -> total 3 words

        const vocab = ["apple", "banana", "cherry"];
        const result = embedText(text, vocab);

        expect(result.length).toBe(3); // vocab length is 3

        // apple freq: 2 / 3
        expect(result[0]).toBeCloseTo(2 / 3);

        // banana freq: 1 / 3
        expect(result[1]).toBeCloseTo(1 / 3);

        // cherry freq: 0 / 3
        expect(result[2]).toBe(0);
    });

    it('should handle words that are only numbers', () => {
        const text = "year 2023 was 2023";
        // tokenize words: year(1), 2023(2), was(1) -> total 4 words
        // vocabulary sorted: 2023, was, year

        const result = embedText(text);

        expect(result.length).toBe(3);

        // 2023 appears twice -> 2 / 4
        expect(result[0]).toBeCloseTo(0.5);

        // was -> 1 / 4
        expect(result[1]).toBeCloseTo(0.25);

        // year -> 1 / 4
        expect(result[2]).toBeCloseTo(0.25);
    });

    it('should handle case insensitivity', () => {
        const text = "Hello hello HeLLo";
        // words: hello(3), total 3
        // vocab: hello
        const result = embedText(text);

        expect(result.length).toBe(1);
        expect(result[0]).toBe(1); // 3 / 3 = 1
    });

    it('should normalize word frequencies by max(words.length, 1)', () => {
        // even if text is empty but vocab is provided, it shouldn't divide by 0
        const text = "";
        const vocab = ["hello"];

        const result = embedText(text, vocab);

        expect(result.length).toBe(1);
        expect(result[0]).toBe(0); // 0 / max(0, 1) = 0
    });
});
