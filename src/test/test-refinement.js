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

const genAI = new GoogleGenerativeAI(apiKey);

async function testRefinement() {
    try {
        console.log("Testing Refinement Prompt...");
        const model = genAI.getGenerativeModel({
            model: "gemini-3-flash-preview",
            systemInstruction: `You are an expert solution architect. Analyze the provided system description and return ONLY a valid JSON object.`
        }, { apiVersion: "v1beta" });

        const currentArch = {
            components: [{ id: "c1", name: "Web App", type: "frontend" }],
            connections: [],
            layers: [{ name: "Presentation", componentIds: ["c1"] }]
        };

        const prompt = `
Current Architecture: ${JSON.stringify(currentArch)}

User Modification Request: Add a PostgreSQL Database for user data.

Instructions: Update the architecture based strictly on the user's modification request. Maintain the existing structure unless asked to change it. Return the full valid JSON object for the updated architecture.
`;

        const result = await model.generateContent(prompt);
        console.log("Response:", result.response.text());

    } catch (e) {
        console.error("Error:", e.message);
    }
}

testRefinement();
