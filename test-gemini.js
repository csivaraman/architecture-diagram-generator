import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = "AIzaSyByFRdqZqxCN87BGFmQipU8TmDwy3Boitg";

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
