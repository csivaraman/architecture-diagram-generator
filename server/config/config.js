import dotenv from 'dotenv';

// Try to load .env.local, but don't fail if it's missing (e.g. Vercel uses production env vars)
try {
    dotenv.config({ path: ".env.local" });
} catch (e) {
    // Standard environment variables will be used
}

export const serverConfig = {
    port: process.env.PORT || 3001,
    env: process.env.NODE_ENV || 'development'
};

// Helper to get unique, truthy API keys from a list of env var names
const getApiKeys = (names) => {
    const keys = names.map(name => process.env[name]).filter(Boolean);
    return [...new Set(keys)]; // Deduplicate just in case same key is used with multiple names
};

export const geminiConfig = {
    keys: getApiKeys([
        'GEMINI_API_KEY',
        'GOOGLE_API_KEY',
        'GEMINI_API_KEY_1',
        'GEMINI_API_KEY_2',
        'GEMINI_API_KEY_3',
        'GEMINI_API_KEY_4',
        'GEMINI_API_KEY_5'
    ]),
    generationConfig: {
        temperature: 0.5,
        maxOutputTokens: 4096,
        topP: 0.95,
        topK: 40,
        responseMimeType: "application/json",
    }
};

export const groqConfig = {
    keys: getApiKeys([
        'GROQ_API_KEY',
        'GROQ_KEY_1',
        'GROQ_KEY_2',
        'GROQ_KEY_3'
    ]),
    priority: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'],
    models: {
        'llama-3.3-70b-versatile': { rpm: 30, tpm: 20000, rpd: 1000, quality: 'high' },
        'llama-3.1-8b-instant': { rpm: 30, tpm: 20000, rpd: 14400, quality: 'medium' }
    }
};
