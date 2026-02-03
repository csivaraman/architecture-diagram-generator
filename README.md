# Architecture Diagram Generator

A professional architecture diagram generator built with React and **Google Antigravity's Built-in AI (Gemini Nano)**.

This application runs locally in your browser and uses the `window.ai` API to convert natural language descriptions into beautiful, layered architecture diagrams.

## Features

- 🧠 **Built-in AI**: Uses `window.ai.generate()` to understand your architecture. No API keys required!
- 🎨 **Auto-Layout**: Intelligently organizes components into layers (Frontend, Backend, Database, Infrastructure).
- 🖼️ **SVG Rendering**: High-quality, scalable vector graphics.
- 💾 **Export**: Download your diagrams as SVG files.
- 🔍 **Interactive**: Zoom and pan controls.
- 🚀 **Zero Config**: Just run it inside Antigravity!

## Prerequisites

- **Google Antigravity** environment (standard browser/IDE with `window.ai` enabled).
- Node.js & npm.

## Installation

```bash
npm install
```

## Usage

1. Start the development server:
   ```bash
   npm run dev
   ```
2. Open the application in your Antigravity browser preview (port 3000).
3. EITHER:
   - Click **"Load Example"** for a quick demo.
   - OR Enter your own **System Name** and **Description**.
4. Click **"Generate Diagram"**.

The AI will analyze your description, identify components and connections, and render the diagram automatically.

## Technology Stack

- **React 18** (Vite)
- **window.ai** (Gemini Nano)
- **Lucide React** (Icons)
- **SVG** (Rendering)
- **CSS3** (Styling)

## Troubleshooting

- **"window.ai is not available"**: This app MUST be run inside the Antigravity IDE/browser environment which provides the built-in AI model. It will not work in a standard Chrome/Safari browser unless `window.ai` is polyfilled or enabled (e.g. Chrome Canary with AI features).
