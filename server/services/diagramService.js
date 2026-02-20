import { GoogleGenerativeAI } from '@google/generative-ai';
import { getCachedDiagram, setCachedDiagram } from './cacheService.js';
import RateLimiter from './RateLimiter.js';
import { geminiConfig, groqConfig } from '../config/config.js';

const GENERATION_CONFIG_GEMINI = {
    temperature: 0.5,
    maxOutputTokens: 4096,
    topP: 0.95,
    topK: 40,
    responseMimeType: "application/json",
};

console.log("\n\n---------------------------------------------------");
console.log("   🚀 DIAGRAM SERVICE LOADED (UPDATED LOGGING)   ");
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

const CLOUD_SYSTEM_PROMPT = `
You are an expert cloud architect. Generate a technical architecture diagram in JSON format.

Your response must follow this exact structure:

{
  "systemName": "Short descriptive title",
  "cloudProvider": "aws" | "azure" | "gcp" | "multi",
  "components": [
    {
      "id": "unique-id",
      "name": "Component Name",
      "type": "user|frontend|backend|database|cache|queue|api|service|external",
      "description": "Brief description",
      "technologies": ["tech1"],
      "cloudProvider": "aws",
      "cloudService": "Lambda",      // exact service name
      "groupId": "group-vpc-1"       // which boundary group this belongs to
    }
  ],
  "connections": [
    {
      "from": "component-id",
      "to": "component-id",
      "label": "HTTPS",
      "type": "sync|async|bidirectional"
    }
  ],
  "layers": [
    { "name": "Client|Application|Data", "componentIds": ["id1"] }
  ],
  "groups": [
    {
      "id": "group-region-1",
      "name": "AWS Region (us-east-1)",
      "groupType": "region",          // region | vpc | subnet | az | security_group | resource_group | project
      "cloudProvider": "aws",
      "parentGroupId": null,          // null = top level, or ID of parent group
      "componentIds": ["id1", "id2"], // components directly in this group
      "childGroupIds": ["group-vpc-1"]
    },
    {
      "id": "group-vpc-1",
      "name": "Amazon VPC",
      "groupType": "vpc",
      "cloudProvider": "aws",
      "parentGroupId": "group-region-1",
      "componentIds": ["id3", "id4"],
      "childGroupIds": []
    }
  ]
}

IMPORTANT GROUPING RULES:
- For AWS: use groupTypes: region, vpc, subnet, az, security_group
- For Azure: use groupTypes: subscription, resource_group, vnet, subnet
- For GCP: use groupTypes: project, vpc, subnet, region, zone
- Every component must be assigned to exactly one group via groupId
- Groups can be nested via parentGroupId/childGroupIds
`;

/**
 * wrappers for Gemini generation
 */
async function generateWithGemini(systemDescription, promptInstructions, systemPrompt = DEFAULT_SYSTEM_PROMPT) {
    if (GEMINI_KEYS.length === 0) {
        throw new Error('No Gemini API keys configured. Please add GEMINI_API_KEY to your environment variables.');
    }

    const prompt = `${systemPrompt} \n\n${promptInstructions} \n\nDescription: ${systemDescription} \n\nGenerate the architecture JSON.`;
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
                        `Attempt: ${attempt + 1} | ` +
                        `Quality: ${geminiLimiter.models[modelName].quality}`
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
            const keyId = keyIndex + 1;

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
                    console.warn(`[Gemini] ⚠️ JSON Truncated. Retrying with double maxOutputTokens (8192)...`);
                    hasRetriedForTruncation = true;
                    // Double the output tokens for the next attempt
                    currentConfig = { ...GENERATION_CONFIG_GEMINI, maxOutputTokens: 8192 };
                    // We don't increment attempt count essentially, to allow full retries with new config
                    attempt--;
                    continue;
                } else {
                    console.error(`[Gemini] ❌ JSON Truncated AGAIN despite higher limit.`);
                }
            }

            console.error(`[Gemini] Unhandled Error: ${errorMsg}`);
        }
    }
    throw new Error(`Gemini generation failed after multiple attempts. Last error: ${lastError?.message}`);
}

/**
 * wrapper for Groq generation
 */
async function generateWithGroq(systemDescription, promptInstructions, systemPrompt = DEFAULT_SYSTEM_PROMPT) {
    if (GROQ_KEYS.length === 0) {
        throw new Error('No Groq API keys configured.');
    }

    const prompt = `${systemPrompt} \n\n${promptInstructions} \n\nDescription: ${systemDescription} \n\nGenerate the architecture JSON.`;
    let lastError;

    console.log(`[Groq] Available models: ${groqLimiter.getRecommendedModels().join(', ')}`);

    for (let attempt = 0; attempt < 8; attempt++) {
        const available = await groqLimiter.getKeyAndModel();

        if (!available) {
            throw new Error('All Groq API keys and models are currently rate-limited.');
        }

        const { keyIndex, model: modelName } = available;
        const apiKey = GROQ_KEYS[keyIndex];
        const maskedKey = `${apiKey.substring(0, 6)}...${apiKey.substring(apiKey.length - 4)} `;

        const modelStats = groqLimiter.getStats()[keyIndex][modelName];
        const MAX_ATTEMPTS = 8;

        console.log(
            `[Groq] 🚀 Attempt ${attempt + 1}/${MAX_ATTEMPTS} | ` +
            `Key #${keyIndex + 1} (${maskedKey}) | ` +
            `Model: ${modelName} | ` +
            `Usage: ${modelStats.requestCount}/${Math.floor(groqLimiter.models[modelName].rpm * 0.8)} RPM, ` +
            `${modelStats.dailyCount}/${Math.floor(groqLimiter.models[modelName].rpd * 0.8)} RPD`
        );

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
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: `${promptInstructions}\n\nDescription: ${systemDescription}` }
                    ],
                    response_format: { type: 'json_object' },
                    temperature: 0.5,
                    max_tokens: 4096,
                    top_p: 0.95
                })
            });
            const latency = Date.now() - startTime;

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const errorMsg = errorData.error?.message || response.statusText;

                if (response.status === 429) {
                    console.warn(`[Groq Service] Key #${keyIndex + 1} | Model: ${modelName} hit rate limit (429).`);
                    groqLimiter.reportQuotaExceeded(keyIndex, modelName);
                    continue;
                }

                if (response.status >= 500) {
                    console.warn(`[Groq Service] Server error ${response.status}. Retrying...`);
                    // Retry once immediately for 500s? Or let the loop handle it via continue?
                    // Loop handles it by trying next key/model, which is safer
                    continue;
                }

                throw new Error(`Groq API Error ${response.status}: ${errorMsg}`);
            }

            const data = await response.json();
            const content = data.choices[0].message.content;

            let diagramData;
            try {
                diagramData = JSON.parse(content);
            } catch (e) {
                // Sometimes local models wrap in ```json
                const cleaned = content.replace(/```json\n ?/g, '').replace(/```\n?/g, '').trim();
                diagramData = JSON.parse(cleaned);
            }

            // If "diagram" wrapper is present in JSON (sometimes models do this despite prompt), unwrap it
            if (diagramData.diagram && !diagramData.components) {
                diagramData = diagramData.diagram;
            }

            groqLimiter.recordRequest(keyIndex, modelName);

            console.log(
                `[Groq] ✅ SUCCESS in ${latency}ms | ` +
                `Model: ${modelName} | ` +
                `Attempt: ${attempt + 1} | ` +
                `Quality: ${groqLimiter.models[modelName].quality}`
            );

            return {
                diagram: diagramData,
                diagnostics: { keyId: keyIndex + 1, model: modelName, provider: 'groq' }
            };

        } catch (err) {
            lastError = err;
            const errorMsg = (err.message || '') + (err.toString() || '');

            if (errorMsg.includes('timeout')) {
                console.warn(`[Groq] ⏱️ Timeout for ${modelName}`);
                groqLimiter.reportModelFailure(modelName, keyIndex);
                continue;
            }

            if (errorMsg.includes('429') || errorMsg.includes('quota') || errorMsg.includes('Rate limit')) {
                console.warn(`[Groq] 🚫 Rate limit hit for ${modelName}`);
                groqLimiter.reportQuotaExceeded(keyIndex, modelName);
                continue;
            }

            if (errorMsg.includes('404') || errorMsg.includes('not found') || errorMsg.includes('not supported')) {
                console.warn(`[Groq] ❌ Model ${modelName} not available (404)`);
                groqLimiter.markModelUnavailable(modelName);
                continue;
            }

            if (errorMsg.includes('503') || errorMsg.includes('overloaded') || errorMsg.includes('Service Unavailable')) {
                console.warn(`[Groq] 🔄 Overloaded. Trying next...`);
                groqLimiter.reportModelFailure(modelName, keyIndex);
                continue;
            }

            // For fetch/network errors, try next
            if (errorMsg.includes('fetch') || errorMsg.includes('network')) {
                console.warn(`[Groq] 🌐 Network error. Retrying...`);
                continue;
            }

            console.error(`[Groq Service] Unhandled Error:`, err);
            continue;
        }
    }
    throw new Error(`Groq generation failed after multiple attempts. Last error: ${lastError?.message}`);
}

/**
 * Generates an architecture diagram for the given description
 * @param {string} systemDescription 
 * @param {string} promptInstructions Optional custom instructions
 * @param {string} provider 'gemini' | 'groq'
 * @returns {Promise<object>}
 */
/**
 * Generates an architecture diagram for the given description
 * @param {string} systemDescription 
 * @param {string} promptInstructions Optional custom instructions
 * @param {string} provider 'gemini' | 'groq'
 * @param {string} cloudProvider 'auto' | 'aws' | 'azure' | 'gcp' | 'none'
 * @returns {Promise<object>}
 */
export const generateDiagram = async (systemDescription, promptInstructions = '', provider = 'gemini', cloudProvider = 'auto') => {
    if (!systemDescription) {
        throw new Error('System description is required');
    }

    // cache key includes provider to avoid mixing different model qualities
    const cacheKey = `${provider}:${cloudProvider}:${systemDescription}`;
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

    // ✅ OPTIMIZED: Concise cloud instructions
    const cloudInstructions = {
        'auto': `Detect cloud provider. 
        'aws': For AWS components, add: "cloudProvider": "aws", "cloudService": "<service>" (Lambda, S3, DynamoDB, etc.).
        'azure': For Azure components, add: "cloudProvider": "azure", "cloudService": "<service>" (Functions, Cosmos DB, etc.).
        'gcp': For GCP components, add: "cloudProvider": "gcp", "cloudService": "<service>" (Cloud Run, BigQuery, etc.).
        IMPORTANT: You MUST organize components into hierarchical groups (e.g., Region > VPC > Subnet) using the 'groups' array and 'groupId' on components.`,
        'none': ''
    };

    let selectedInstructions = cloudInstructions[cloudProvider] || cloudInstructions['auto'];
    if (cloudProvider === 'none') selectedInstructions = "";


    const fullInstructions = `${promptInstructions}\n\n${selectedInstructions}`;

    const systemPrompt = (cloudProvider !== 'none') ? CLOUD_SYSTEM_PROMPT : DEFAULT_SYSTEM_PROMPT;

    let result;
    if (provider === 'groq') {
        result = await generateWithGroq(systemDescription, fullInstructions, systemPrompt);
    } else {
        result = await generateWithGemini(systemDescription, fullInstructions, systemPrompt);
    }

    setCachedDiagram(cacheKey, result.diagram);
    // Also set old key format for backward compatibility if needed? No, better to segregate.

    return {
        success: true,
        ...result,
        fromCache: false,
        timestamp: Math.floor(Date.now() / 1000),
        cacheInfo: { hit: false }
    };
};
