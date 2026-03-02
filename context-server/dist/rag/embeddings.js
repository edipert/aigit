"use strict";
/**
 * Embedding utilities for semantic search.
 * Uses a simple local TF-IDF–like approach for offline use.
 * Can be swapped with OpenAI or @xenova/transformers later.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.cosineSimilarity = cosineSimilarity;
exports.embedText = embedText;
exports.buildVocabulary = buildVocabulary;
exports.rankBySimilarity = rankBySimilarity;
/**
 * Cosine similarity between two vectors.
 */
function cosineSimilarity(a, b) {
    if (a.length !== b.length || a.length === 0)
        return 0;
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }
    const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
    return magnitude === 0 ? 0 : dotProduct / magnitude;
}
/**
 * Simple keyword-based embedding: maps text to a sparse vector
 * based on normalized word frequencies. Zero-dependency, fully offline.
 */
function embedText(text, vocabulary) {
    const words = tokenize(text);
    const wordFreq = new Map();
    for (const w of words) {
        wordFreq.set(w, (wordFreq.get(w) || 0) + 1);
    }
    // Use provided vocabulary or build from the text itself
    const vocab = vocabulary || Array.from(wordFreq.keys()).sort();
    const vector = new Array(vocab.length).fill(0);
    for (let i = 0; i < vocab.length; i++) {
        vector[i] = (wordFreq.get(vocab[i]) || 0) / Math.max(words.length, 1);
    }
    return vector;
}
/**
 * Build a vocabulary from multiple documents for consistent embedding dimensions.
 */
function buildVocabulary(documents) {
    const allWords = new Set();
    for (const doc of documents) {
        for (const w of tokenize(doc)) {
            allWords.add(w);
        }
    }
    return Array.from(allWords).sort();
}
/**
 * Rank documents by semantic similarity to a query.
 */
function rankBySimilarity(query, documents, topK = 5) {
    if (documents.length === 0)
        return [];
    const allTexts = [query, ...documents.map(d => d.text)];
    const vocab = buildVocabulary(allTexts);
    const queryVec = embedText(query, vocab);
    const results = documents.map(doc => ({
        id: doc.id,
        text: doc.text,
        score: cosineSimilarity(queryVec, embedText(doc.text, vocab)),
    }));
    return results
        .sort((a, b) => b.score - a.score)
        .slice(0, topK)
        .filter(r => r.score > 0);
}
function tokenize(text) {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 2); // Ignore very short words
}
