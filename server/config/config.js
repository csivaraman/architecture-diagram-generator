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

export const geminiConfig = {
    keys: [
        process.env.GEMINI_API_KEY_1,
        process.env.GEMINI_API_KEY_2,
        process.env.GEMINI_API_KEY_3,
        process.env.GEMINI_API_KEY_4,
        process.env.GEMINI_API_KEY_5
    ].filter(Boolean),
    generationConfig: {
        temperature: 0.5,
        maxOutputTokens: 4096,
        topP: 0.95,
        topK: 40,
        responseMimeType: "application/json",
    }
};

export const groqConfig = {
    keys: [
        process.env.GROQ_KEY_1,
        process.env.GROQ_KEY_2,
        process.env.GROQ_KEY_3
    ].filter(Boolean),
    priority: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'],
    models: {
        'llama-3.3-70b-versatile': { rpm: 30, tpm: 20000, rpd: 1000, quality: 'high' },
        'llama-3.1-8b-instant': { rpm: 30, tpm: 20000, rpd: 14400, quality: 'medium' }
    }
};
