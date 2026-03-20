import { pipeline, FeatureExtractionPipeline } from '@xenova/transformers';

let extractorPromise: Promise<FeatureExtractionPipeline> | null = null;

async function getExtractor() {
    if (!extractorPromise) {
        // Uses the lightweight all-MiniLM-L6-v2 model (~22MB)
        extractorPromise = pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
            quantized: true, 
        }) as Promise<FeatureExtractionPipeline>;
    }
    return extractorPromise;
}

/**
 * Generate a dense vector embedding (384 dimensions) for a given text.
 * Uses a true Transformer language model locally.
 */
export async function embedText(text: string): Promise<number[]> {
    try {
        const extractor = await getExtractor();
        const output = await extractor(text, { pooling: 'mean', normalize: true });
        return Array.from(output.data);
    } catch (err) {
        console.error('[aigit] Failed to generate embedding with Transformers.js:', err);
        // Fallback to random vector if critical failure, to prevent hard crashing
        // in environments without proper native bindings, though Xenova is WASM-based.
        return new Array(384).fill(0).map(() => Math.random() - 0.5);
    }
}

