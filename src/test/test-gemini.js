import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// --- Load .env.local manually ---
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../../.env.local');

if (fs.existsSync(envPath)) {
    console.log(`Loading environment variables from ${envPath}`);
    const envConfig = fs.readFileSync(envPath, 'utf-8');
    envConfig.split('\n').forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
            const key = match[1].trim();
            const value = match[2].trim().replace(/^['"]|['"]$/g, '');
            process.env[key] = value;
        }
    });
} else {
    console.warn("⚠️ .env.local file not found.");
}

// Get the first available Gemini API key
const apiKey = Object.keys(process.env)
    .filter(key => key.startsWith('VITE_GEMINI_API_KEY_'))
    .sort()
    .map(key => process.env[key])
    .find(Boolean);

if (!apiKey) {
    console.error("❌ No VITE_GEMINI_API_KEY_* found in environment.");
    process.exit(1);
}

async function testModel() {
    const genAI = new GoogleGenerativeAI(apiKey);
    try {
        console.log("Testing gemini-3-flash-preview with v1beta...");
        const model = genAI.getGenerativeModel({
            model: "gemini-3-flash-preview"
        }, { apiVersion: "v1beta" });

        const result = await model.generateContent("Hello, are you working?");
        console.log("Success:", result.response.text());
    } catch (e) {
        console.error("Failed:", e.message);
    }
}

testModel();
