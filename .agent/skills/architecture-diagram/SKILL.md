---
name: architecture-diagram-antigravity
description: Creates interactive architecture diagrams using React, SVG, and Antigravity's built-in AI
---

# Architecture Diagram Generator with Antigravity Built-In AI

This skill guides creation of a web app that generates solution architecture diagrams from natural language using Antigravity's built-in Gemini 3 Pro (NO API KEY REQUIRED).

## Critical Requirements

### Use Antigravity's Built-In AI API

**DO NOT use external APIs or API keys!**

Instead, use Antigravity's `window.ai` API:
```javascript
// Correct approach - use Antigravity's built-in AI
const response = await window.ai.generate({
  messages: [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ],
  temperature: 0.3
});

const result = response.text;
```

### Technology Stack
- React 18+ with Vite
- Antigravity's window.ai API (built-in, no package needed)
- SVG for diagram rendering
- Lucide React for icons
- NO external API packages
- NO API keys or environment variables

### System Prompt for AI
You are an expert solution architect. Analyze the provided system description and return ONLY a valid JSON object with no markdown formatting, no code blocks, no explanation. Just pure JSON.
Structure:
{
"components": [
{
"id": "unique-id",
"name": "Component Name",
"type": "frontend|backend|database|cache|queue|api|service|external",
"description": "Brief description",
"technologies": ["tech1", "tech2"]
}
],
"connections": [
{
"from": "component-id",
"to": "component-id",
"label": "Protocol/Method",
"type": "sync|async|bidirectional"
}
],
"layers": [
{
"name": "Presentation|Application|Data|Infrastructure",
"componentIds": ["id1", "id2"]
}
]
}
Identify all major components, their relationships, and organize them into logical architectural layers.

### Application Features
1. **Input Form**: System name + description textarea
2. **AI Analysis**: Use window.ai to analyze architecture
3. **Auto Layout**: Position components in layers
4. **SVG Rendering**: Interactive, color-coded diagram
5. **User Controls**: Zoom in/out, download SVG
6. **Example Data**: Pre-loaded e-commerce example

### Error Handling
- Check if window.ai exists (graceful degradation)
- Handle AI response errors
- Parse JSON safely
- Display user-friendly error messages
- No API key validation needed!

### Design Guidelines
- Modern, professional UI
- Purple gradient background
- White card-based layout
- Smooth animations
- Loading states during generation
- **Professional Connector Routing**:
  - Use straight orthogonal lines (no diagonals)
  - Horizontal/Vertical segments with 90-degree bends
  - Proper component alignment to minimize crossings
  - Logical entry/exit points (top/bottom/sides)
  - Adequate spacing between all elements

- **In-Memory Caching Implementation**:
  - Generate cache keys using SHA-256 hash of normalized system descriptions.
  - Normalize text: lowercase, trim, collapse spaces.
  - Store results for 4 hours (14400 seconds).
  - **Limit**: Store a maximum of 25 records.
  - **Eviction**: Use FIFO (First-In-First-Out) to remove oldest items when the limit is reached.
  - Return cached JSON if available without calling Gemini API.
- **Service Endpoints**:
  - `POST /api/generate-diagram`: Main generation logic with caching.
  - `GET /api/cache/stats`: Monitor cache performance.
  - `DELETE /api/cache`: Clear all cache manually.
  - `GET /api/health`: Monitor service status.

### NO Environment Variables Needed (Service Mode)
- Service handles multiple Gemini API keys.
- Frontend talks to local server.