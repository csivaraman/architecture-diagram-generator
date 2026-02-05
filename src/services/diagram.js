import { GoogleGenerativeAI } from '@google/generative-ai';
import { getCachedDiagram, setCachedDiagram } from './cache.js';
import RateLimiter from './RateLimiter.js';
import dotenv from 'dotenv';

// Try to load .env.local, but don't fail if it's missing (Vercel uses production env vars)
try {
    dotenv.config({ path: ".env.local" });
} catch (e) {
    // Standard environment variables will be used
}

/**
 * Initialize RateLimiter with all available keys
 */
const API_KEYS = [
    process.env.VITE_GEMINI_API_KEY_1,
    process.env.VITE_GEMINI_API_KEY_2,
    process.env.VITE_GEMINI_API_KEY_3,
    process.env.VITE_GEMINI_API_KEY_4,
    process.env.VITE_GEMINI_API_KEY_5
].filter(Boolean);

if (API_KEYS.length === 0) {
    console.error('[Diagram Service] No API keys found in .env.local');
}

const limiter = new RateLimiter(API_KEYS);

/**
 * Standard system prompt for the architect
 */
const DEFAULT_SYSTEM_PROMPT = `
You are an expert software architect.Generate a technical architecture diagram in JSON format for the given description.

Your response must have this exact structure:

{
    "systemName": "A short, descriptive title",
        "components": [
            {
                "id": "unique-id",
                "name": "Component Name",
                "type": "user|frontend|backend|database|cache|queue|api|service|external",
                "description": "Brief description",
                "technologies": ["tech1", "tech2"]
            }
        ],
            "connections": [
                {
                    "from": "component-id",
                    "to": "component-id",
                    "label": "Protocol",
                    "type": "sync|async|bidirectional"
                }
            ],
                "layers": [
                    {
                        "name": "Client|Presentation|Application|Data|Infrastructure",
                        "componentIds": ["id1", "id2"]
                    }
                ]
} `;

/**
 * Generates an architecture diagram for the given description
 * @param {string} systemDescription 
 * @param {string} promptInstructions Optional custom instructions
 * @returns {Promise<object>}
 */
export const generateDiagram = async (systemDescription, promptInstructions = '') => {
    if (!systemDescription) {
        throw new Error('System description is required');
    }

    // 1. Check Cache
    const cached = getCachedDiagram(systemDescription);
    if (cached) {
        return {
            success: true,
            diagram: cached,
            fromCache: true,
            timestamp: Math.floor(Date.now() / 1000),
            cacheInfo: { hit: true, expiresIn: "4 hours" }
        };
    }

    // 2. Generate via Gemini (with RateLimiter and Fallback)
    const prompt = `${DEFAULT_SYSTEM_PROMPT} \n\n${promptInstructions} \n\nDescription: ${systemDescription} \n\nGenerate the architecture JSON.`;

    let lastError;

    // Attempt generation with RateLimiter managing keys and models
    for (let attempt = 0; attempt < 10; attempt++) {
        const available = await limiter.getKeyAndModel();

        if (!available) {
            throw new Error('All API keys and models are currently rate-limited. Please try again later.');
        }

        const { keyIndex, model: modelName } = available;
        const apiKey = API_KEYS[keyIndex];
        const maskedKey = `${apiKey.substring(0, 6)}...${apiKey.substring(apiKey.length - 4)} `;

        console.log(`[Diagram Service]REQUEST: Key #${keyIndex + 1} (${maskedKey}) | Model: ${modelName} `);

        try {
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: modelName });

            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            // Parse and clean response
            const cleanedContent = text
                .replace(/```json\n ?/g, '')
                .replace(/```\n?/g, '')
                .trim();

            let diagramData;
            try {
                diagramData = JSON.parse(cleanedContent);
            } catch (parseErr) {
                console.error(`[Diagram Service] ${modelName} JSON Parse Error:`, text);
                throw new Error('Failed to parse architecture JSON from AI response');
            }

            // Record success and cache
            limiter.recordRequest(keyIndex, modelName);
            setCachedDiagram(systemDescription, diagramData);

            return {
                success: true,
                diagram: diagramData,
                fromCache: false,
                timestamp: Math.floor(Date.now() / 1000),
                cacheInfo: { hit: false, expiresIn: "N/A" },
                diagnostics: {
                    keyId: keyIndex + 1,
                    model: modelName
                }
            };
        } catch (err) {
            lastError = err;
            const errorMsg = err.message || '';

            // Check for quota/rate limit errors
            if (errorMsg.includes('429') || errorMsg.includes('quota') || errorMsg.includes('Rate limit')) {
                console.warn(`[Diagram Service] Key #${keyIndex + 1} | Model: ${modelName} hit rate limit. Switching...`);
                limiter.reportQuotaExceeded(keyIndex, modelName);
                continue; // Try next available combo
            }

            // Check for model not found (could happen in some regions)
            if (errorMsg.includes('404') || errorMsg.includes('not found') || errorMsg.includes('supported for generateContent')) {
                console.warn(`[Diagram Service] Key #${keyIndex + 1} | Model: ${modelName} not available or supported. Switching...`);
                limiter.reportQuotaExceeded(keyIndex, modelName); // Treat as a temporary issue for this key/model combo
                continue;
            }

            throw new Error(`Diagram generation failed: ${errorMsg}`);
        }
    }

    throw new Error(`Diagram generation failed after multiple attempts. Last error: ${lastError?.message}`);
};
