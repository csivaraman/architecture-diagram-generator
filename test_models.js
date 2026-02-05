import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEYS = [
    'AIzaSyA0eGnk4A_CegtRt3S99eO24jru3crDvdw',
    'AIzaSyBImVR2s5-7GEEIpMpqyIVw9L2uNRxEq1Q',
    'AIzaSyDLGJh19Td1fjY1jmtcZxLwWe2GIRwYOeQ'
];

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
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent("Hello.");
            const response = await result.response;
            console.log(`  🔑 Key ${i + 1}: ✅ SUCCESS`);
        } catch (error) {
            console.log(`  🔑 Key ${i + 1}: ❌ FAILED - ${error.message.substring(0, 50)}...`);
        }
    }
}

async function runFinalTests() {
    for (const model of MODELS_TO_TEST) {
        await testModelOnAllKeys(model);
    }
}

runFinalTests();
