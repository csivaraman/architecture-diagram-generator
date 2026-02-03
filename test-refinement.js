import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = "AIzaSyBhCqtzywlw3ldjgaWxfv0MjSUSpYMw8uo"; // .env.local key
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
