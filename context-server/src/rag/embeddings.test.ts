import { describe, it, expect, vi, beforeEach } from 'vitest';
import { embedText } from './embeddings';

// Mock the Transformers.js pipeline
vi.mock('@xenova/transformers', () => {
    return {
        pipeline: vi.fn().mockResolvedValue(
            vi.fn().mockResolvedValue({
                data: new Float32Array(384).fill(0.1)
            })
        )
    };
});

describe('embedText', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should calculate an embedding vector correctly for a standard string', async () => {
        const text = "apple banana apple";
        const result = await embedText(text);

        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBe(384);
    });

    it('should handle an empty string gracefully', async () => {
        const text = "";
        const result = await embedText(text);

        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBe(384);
    });

    it('should fallback to 384 random vector if model parsing fails', async () => {
        // Mock a failure just once to cover catch block
        vi.mocked(await import('@xenova/transformers')).pipeline.mockRejectedValueOnce(new Error('Failed') as never);
        
        const result = await embedText("error case");
        expect(result.length).toBe(384);
        // It's random, so it shouldn't equal 0.1 explicitly
    });
});

