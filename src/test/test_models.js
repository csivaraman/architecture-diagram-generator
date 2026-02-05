import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// --- Load .env.local manually (Zero-dependency approach) ---
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../../.env.local');

if (fs.existsSync(envPath)) {
    console.log(`Loading environment variables from ${envPath}`);
    const envConfig = fs.readFileSync(envPath, 'utf-8');
    envConfig.split('\n').forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
            const key = match[1].trim();
            const value = match[2].trim().replace(/^['"]|['"]$/g, ''); // Remove quotes if present
            process.env[key] = value;
        }
    });
} else {
    console.warn("⚠️ .env.local file not found. Ensure environment variables are set manually.");
}

// --- Collect API Keys ---
// Looks for keys starting with VITE_GEMINI_API_KEY_
const API_KEYS = Object.keys(process.env)
    .filter(key => key.startsWith('VITE_GEMINI_API_KEY_'))
    .sort() // Ensure consistent order (KEY_1, KEY_2, etc.)
    .map(key => process.env[key])
    .filter(Boolean); // Remove empty values

if (API_KEYS.length === 0) {
    console.error("❌ No API keys found in environment variables. Please check your .env.local file.");
    process.exit(1);
}

console.log(`✅ Loaded ${API_KEYS.length} API keys from environment.`);

const MODELS_TO_TEST = [
    'gemini-2.5-flash-lite',
    'gemini-3-flash-preview',
    'gemini-3-pro-preview'
];

async function testModelOnAllKeys(modelName) {
    console.log(`\n--- Testing Model: ${modelName} ---`);
    for (let i = 0; i < API_KEYS.length; i++) {
        try {
            const genAI = new GoogleGenerativeAI(API_KEYS[i]);
            // Use a cheaper prompt or ensure max tokens is low to save quota
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent({
                contents: [{ role: 'user', parts: [{ text: 'Hello' }] }],
                generationConfig: { maxOutputTokens: 5 }
            });
            const response = await result.response;
            console.log(`  🔑 Key ${i + 1}: ✅ SUCCESS`);
        } catch (error) {
            let errorMsg = error.message;
            if (errorMsg.includes('429')) errorMsg = 'Quota Exceeded (429)';
            else if (errorMsg.includes('404')) errorMsg = 'Model Not Found (404)';
            else errorMsg = errorMsg.substring(0, 50) + '...';

            console.log(`  🔑 Key ${i + 1}: ❌ FAILED - ${errorMsg}`);
        }
    }
}

async function runFinalTests() {
    for (const model of MODELS_TO_TEST) {
        await testModelOnAllKeys(model);
    }
}

runFinalTests();
