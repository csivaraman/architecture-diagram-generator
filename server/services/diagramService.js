import { GoogleGenerativeAI } from '@google/generative-ai';
import { getCachedDiagram, setCachedDiagram } from './cacheService.js';
import RateLimiter from './RateLimiter.js';
import { geminiConfig, groqConfig } from '../config/config.js';
import { UNIFIED_SYSTEM_PROMPT } from '../config/constants.js';

const GENERATION_CONFIG_GEMINI = {
    temperature: 0.5,
    maxOutputTokens: 4096,
    topP: 0.95,
    topK: 40,
    responseMimeType: "application/json",
};

console.log("\n\n---------------------------------------------------");
console.log("   🚀 DIAGRAM SERVICE LOADED (UNIFIED REFAC)     ");
console.log("---------------------------------------------------\n\n");

/**
 * Initialize RateLimiters
 */
const GEMINI_KEYS = geminiConfig.keys;
const GROQ_KEYS = groqConfig.keys;

console.log(`[Diagram Service] Gemini Keys Detected: ${GEMINI_KEYS.length}`);
console.log(`[Diagram Service] Groq Keys Detected: ${GROQ_KEYS.length}`);

if (GEMINI_KEYS.length === 0) {
    console.warn('[Diagram Service] ⚠️ No Gemini API keys found. Gemini provider will be unavailable.');
}
if (GROQ_KEYS.length === 0) {
    console.warn('[Diagram Service] ⚠️ No Groq API keys found. Groq provider will be unavailable.');
}

export const geminiLimiter = new RateLimiter(GEMINI_KEYS); // Uses default Gemini config
export const groqLimiter = new RateLimiter(GROQ_KEYS, groqConfig, 'rate_limiter_stats_groq.json');

/**
 * wrappers for Gemini generation
 */
async function generateWithGemini(systemDescription, promptInstructions) {
    if (GEMINI_KEYS.length === 0) {
        throw new Error('No Gemini API keys configured. Please add GEMINI_API_KEY to your environment variables.');
    }

    const prompt = `${UNIFIED_SYSTEM_PROMPT} \n\n${promptInstructions} \n\nDescription: ${systemDescription} \n\nGenerate the architecture JSON.`;
    let lastError;

    console.log(`[Gemini] Available models: ${geminiLimiter.getRecommendedModels().join(', ')}`);

    let hasRetriedForTruncation = false;
    let currentConfig = { ...GENERATION_CONFIG_GEMINI };

    for (let attempt = 0; attempt < 8; attempt++) {
        const available = await geminiLimiter.getKeyAndModel();

        if (!available) {
            throw new Error('All Gemini API keys and models are currently rate-limited. Please try again later.');
        }

        const { keyIndex, model: modelName } = available;
        const apiKey = GEMINI_KEYS[keyIndex];
        const maskedKey = `${apiKey.substring(0, 6)}...${apiKey.substring(apiKey.length - 4)} `;

        const modelStats = geminiLimiter.getStats()[keyIndex][modelName];
        const MAX_ATTEMPTS = 8;

        console.log(
            `[Gemini] 🚀 Attempt ${attempt + 1}/${MAX_ATTEMPTS} | ` +
            `Key #${keyIndex + 1} (${maskedKey}) | ` +
            `Model: ${modelName} | ` +
            `Usage: ${modelStats.requestCount}/${Math.floor(geminiLimiter.models[modelName].rpm * 0.8)} RPM, ` +
            `${modelStats.dailyCount}/${Math.floor(geminiLimiter.models[modelName].rpd * 0.8)} RPD`
        );

        try {
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: modelName, generationConfig: currentConfig });

            let result;
            let retryCount = 0;
            const MAX_RETRIES = 1;

            while (true) {
                try {
                    const startTime = Date.now();
                    result = await model.generateContent(prompt);
                    const latency = Date.now() - startTime;
                    console.log(
                        `[Gemini] ✅ SUCCESS in ${latency}ms | ` +
                        `Model: ${modelName} | ` +
                        `Attempt: ${attempt + 1}`
                    );
                    break;
                } catch (reqErr) {
                    const msg = (reqErr.message || '') + (reqErr.toString() || '');
                    if (msg.includes('503') || msg.includes('overloaded') || msg.includes('Service Unavailable')) {
                        if (retryCount < MAX_RETRIES) {
                            console.warn(`[Gemini Service] ⚠️ Model Overloaded (503). Waiting 10s...`);
                            await new Promise(resolve => setTimeout(resolve, 10000));
                            retryCount++;
                            continue;
                        }
                    }
                    throw reqErr;
                }
            }

            const response = await result.response;
            const text = response.text();

            // Clean markdown
            const cleanedContent = text
                .replace(/```json\n ?/g, '')
                .replace(/```\n?/g, '')
                .trim();

            const diagramData = JSON.parse(cleanedContent);

            geminiLimiter.recordRequest(keyIndex, modelName);

            return {
                diagram: diagramData,
                diagnostics: { keyId: keyIndex + 1, model: modelName, provider: 'gemini' }
            };

        } catch (err) {
            lastError = err;
            const errorMsg = (err.message || '') + (err.toString() || '');

            if (errorMsg.includes('timeout')) {
                console.warn(`[Gemini] ⏱️ Timeout for ${modelName}`);
                geminiLimiter.reportModelFailure(modelName, keyIndex);
                continue;
            }

            if (errorMsg.includes('429') || errorMsg.includes('quota') || errorMsg.includes('Rate limit')) {
                console.warn(`[Gemini] 🚫 Rate limit hit for ${modelName}`);
                geminiLimiter.reportQuotaExceeded(keyIndex, modelName);
                continue;
            }

            if (errorMsg.includes('404') || errorMsg.includes('not found') || errorMsg.includes('not supported')) {
                console.warn(`[Gemini] ❌ Model ${modelName} not available (404)`);
                geminiLimiter.markModelUnavailable(modelName);
                continue;
            }

            if (errorMsg.includes('503') || errorMsg.includes('overloaded') || errorMsg.includes('Service Unavailable')) {
                console.warn(`[Gemini] 🔄 Overloaded. Trying next...`);
                geminiLimiter.reportModelFailure(modelName, keyIndex);
                continue;
            }

            // Global retry for truncated JSON (Unterminated string)
            if (errorMsg.includes('Unterminated string in JSON')) {
                if (!hasRetriedForTruncation) {
                    console.warn(`[Gemini] ⚠️ JSON Truncated. Retrying with higher limit...`);
                    hasRetriedForTruncation = true;
                    currentConfig = { ...GENERATION_CONFIG_GEMINI, maxOutputTokens: 8192 };
                    attempt--;
                    continue;
                }
            }

            console.error(`[Gemini] Error: ${errorMsg}`);
        }
    }
    throw new Error(`Gemini generation failed. Last error: ${lastError?.message}`);
}

/**
 * wrapper for Groq generation
 */
async function generateWithGroq(systemDescription, promptInstructions) {
    if (GROQ_KEYS.length === 0) {
        throw new Error('No Groq API keys configured.');
    }

    const prompt = `${UNIFIED_SYSTEM_PROMPT} \n\n${promptInstructions} \n\nDescription: ${systemDescription} \n\nGenerate the architecture JSON.`;
    let lastError;

    for (let attempt = 0; attempt < 8; attempt++) {
        const available = await groqLimiter.getKeyAndModel();

        if (!available) {
            throw new Error('All Groq API keys are rate-limited.');
        }

        const { keyIndex, model: modelName } = available;
        const apiKey = GROQ_KEYS[keyIndex];

        try {
            const startTime = Date.now();
            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: modelName,
                    messages: [
                        { role: 'system', content: UNIFIED_SYSTEM_PROMPT },
                        { role: 'user', content: `${promptInstructions}\n\nDescription: ${systemDescription}` }
                    ],
                    response_format: { type: 'json_object' },
                    temperature: 0.5,
                    max_tokens: 4096
                })
            });
            const latency = Date.now() - startTime;

            if (!response.ok) {
                if (response.status === 429) {
                    groqLimiter.reportQuotaExceeded(keyIndex, modelName);
                    continue;
                }
                throw new Error(`Groq API Error ${response.status}`);
            }

            const data = await response.json();
            const content = data.choices[0].message.content;
            let diagramData = JSON.parse(content);

            if (diagramData.diagram && !diagramData.components) diagramData = diagramData.diagram;

            groqLimiter.recordRequest(keyIndex, modelName);

            console.log(`[Groq] ✅ SUCCESS in ${latency}ms | Model: ${modelName}`);

            return {
                diagram: diagramData,
                diagnostics: { keyId: keyIndex + 1, model: modelName, provider: 'groq' }
            };

        } catch (err) {
            lastError = err;
            continue;
        }
    }
    throw new Error(`Groq generation failed. Last error: ${lastError?.message}`);
}

/**
 * Generates an architecture diagram for the given description
 */
export const generateDiagram = async (systemDescription, promptInstructions = '', provider = 'gemini', cloudProvider = 'auto') => {
    if (!systemDescription) {
        throw new Error('System description is required');
    }

    // Updated cache key: provider:systemDescription (cloudProvider is handled by processor)
    const cacheKey = `provider:${provider}:${systemDescription}`;
    const cached = getCachedDiagram(cacheKey);

    if (cached) {
        return {
            success: true,
            diagram: cached,
            fromCache: true,
            timestamp: Math.floor(Date.now() / 1000),
            cacheInfo: { hit: true, expiresIn: "4 hours" }
        };
    }

    // Cloud-specific instructions to augment the unified prompt
    const cloudInstructions = {
        'auto': 'Detect cloud provider. Map components to cloud services. Organize into hierarchical groups.',
        'aws': 'Force AWS provider. Map components to AWS services. Organize into Region > VPC > Subnet groups.',
        'azure': 'Force Azure provider. Map components to Azure services. Organize into Subscription > Resource Group > VNet groups.',
        'gcp': 'Force GCP provider. Map components to GCP services. Organize into Project > VPC > Subnet groups.',
        'none': 'Generate a general architecture, but still identify likely cloud services (e.g. RDS for DB) for metadata.'
    };

    const selectedInstructions = cloudInstructions[cloudProvider] || cloudInstructions['auto'];
    const fullInstructions = `${promptInstructions}\n\n${selectedInstructions}`;

    let result;
    if (provider === 'groq') {
        result = await generateWithGroq(systemDescription, fullInstructions);
    } else {
        result = await generateWithGemini(systemDescription, fullInstructions);
    }

    // Store the raw unified response in cache
    setCachedDiagram(cacheKey, result.diagram);

    return {
        success: true,
        ...result,
        fromCache: false,
        timestamp: Math.floor(Date.now() / 1000),
        cacheInfo: { hit: false }
    };
};
