# AI Architecture Diagram Generator

A powerful, AI-driven tool to transform natural language descriptions into professional architecture diagrams. Supports both traditional layered views and deep-dive cloud-native visualizations.

## 🚀 Key Features

- **Unified AI Generation**: A single AI call generates data compatible with both generic and cloud views.
- **Multimodal Rate Limiting**: Intelligent backend handling for **5 Gemini API keys** and **3 Groq API keys** with automated token switching and rate-limit tracking.
- **Multi-Cloud Support**: Automatic detection and mapping for **AWS, Azure, and GCP**.
- **Instant Switching**: Seamlessly toggle between "Default" (Layered) and "Cloud" (Grouped) rendering modes.
- **Smart Grouping**: Automatically organizes cloud resources into Regions, VPCs, and Subnets.
- **Rate-Limited Multi-Key Support**: Robust backend handling for Gemini and Groq APIs with intelligent failover and rate limiting.
- **Consolidated Caching**: Efficient in-memory caching for faster responses.
- **SVG Export**: High-fidelity vector graphics downloads for documentation.

## 🛠️ Technology Stack

- **Frontend**: React 18, Vite, Lucide Icons.
- **Backend**: Node.js, Express.
- **AI Models**: Google Gemini (Pro/Flash/Lite), Groq (Llama 3/3.1).
- **Styling**: Modern CSS with glassmorphism and animations.
- **Rendering**: Dynamic SVG generation with auto-layout algorithms.

## ⚙️ Prerequisites

- Node.js (v18+)
- API Keys for **Gemini** and/or **Groq**.

## 💻 Installation

1. Clone the repository and install dependencies:
   ```bash
   npm install
   ```
2. Create a `.env.local` file in the root directory and add your API keys (refer to `.env.example`):
   ```env
   # Gemini API Keys - Pool of 5 for rate limit distribution
   GEMINI_API_KEY_1=your_gemini_api_key_1_here
   GEMINI_API_KEY_2=your_gemini_api_key_2_here
   GEMINI_API_KEY_3=your_gemini_api_key_3_here
   GEMINI_API_KEY_4=your_gemini_api_key_4_here
   GEMINI_API_KEY_5=your_gemini_api_key_5_here

   # Groq API Keys - Pool of 3 for rate limit distribution
   GROQ_KEY_1=your_groq_api_key_1_here
   GROQ_KEY_2=your_groq_api_key_2_here
   GROQ_KEY_3=your_groq_api_key_3_here

   # Server Configuration
   PORT=3001
   ```

## 🚀 Usage

1. Start the application (starts both frontend and backend):
   ```bash
   npm run dev
   ```
2. Open [http://localhost:3000](http://localhost:3000).
3. Enter your system description or use the **"Load Example"** feature.
4. Select your preferred LLM provider (Gemini or Groq).
5. Choose your initial diagram mode (Auto, AWS, Azure, GCP, or None).
6. Click **"Generate Diagram"** and explore the results!

## 🧪 Testing

Run the test suite to verify backend logic and rendering components:
```bash
npm test
```

---
Built with ❤️ by [Chandrasekar Sivaraman](https://www.linkedin.com/in/csivaraman/)
