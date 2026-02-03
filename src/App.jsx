import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Network, Download, ZoomIn, ZoomOut, Loader2, AlertCircle, Play, FileText, Layers } from 'lucide-react';
import './App.css';

// --- Constants & Colors ---
const COMPONENT_COLORS = {
    frontend: { bg: '#3b82f6', border: '#2563eb', text: 'white' },
    backend: { bg: '#10b981', border: '#059669', text: 'white' },
    database: { bg: '#f59e0b', border: '#d97706', text: 'white' },
    cache: { bg: '#ec4899', border: '#db2777', text: 'white' },
    queue: { bg: '#8b5cf6', border: '#7c3aed', text: 'white' },
    api: { bg: '#06b6d4', border: '#0891b2', text: 'white' },
    service: { bg: '#14b8a6', border: '#0d9488', text: 'white' },
    external: { bg: '#6b7280', border: '#4b5563', text: 'white' },
    default: { bg: '#9ca3af', border: '#4b5563', text: 'white' }
};

const EXAMPLE_DATA = {
    name: "E-Commerce Platform",
    description: "A scalable e-commerce platform with microservices architecture. Users can browse products, add items to cart, and checkout. The system includes product catalog, user authentication, payment processing, order management, and inventory tracking. Uses React frontend, Node.js microservices, PostgreSQL for transactional data, Redis for caching, and RabbitMQ for async communication between services."
};

// --- Helper Functions ---
const getComponentColor = (type) => {
    const normalizedType = type?.toLowerCase() || 'default';
    return COMPONENT_COLORS[normalizedType] || COMPONENT_COLORS.default;
};

// --- AI Integration ---
const SYSTEM_PROMPT = `You are an expert solution architect. Analyze the provided system description and return ONLY a valid JSON object with no markdown formatting, no code blocks, no explanation. Just pure JSON.
Your response must have this exact structure:
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
      "label": "HTTP/HTTPS/gRPC/WebSocket/etc",
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
Identify all major components, their relationships, and organize them into logical architectural layers. Be comprehensive but concise.`;

// --- Layout Engine ---
const calculateLayout = (architecture) => {
    if (!architecture || !architecture.layers) return { components: [], connections: [], width: 1200, height: 800 };

    const COMPONENT_WIDTH = 180;
    const COMPONENT_HEIGHT = 90;
    const COMPONENT_GAP_X = 60; // Horizontal gap between components
    const LAYER_PADDING_Y = 60; // Top padding inside layer for text
    const LAYER_HEIGHT = 220;   // Increased height per layer
    const PADDING_X = 40;
    const PADDING_Y = 40;

    const layersWithComponents = architecture.layers.map(layer => {
        return {
            ...layer,
            components: architecture.components.filter(c => layer.componentIds.includes(c.id))
        };
    });

    // 1. Calculate Dynamic Canvas Width
    let maxComponentsInLayer = 0;
    layersWithComponents.forEach(layer => {
        maxComponentsInLayer = Math.max(maxComponentsInLayer, layer.components.length);
    });

    // Add some buffer width
    const calculatedWidth = (maxComponentsInLayer * (COMPONENT_WIDTH + COMPONENT_GAP_X)) + (PADDING_X * 2);
    const CANVAS_WIDTH = Math.max(1200, calculatedWidth);

    const positionedComponents = [];

    layersWithComponents.forEach((layer, layerIndex) => {
        // Calculate Y position for the layer container and components
        // layerIndex * LAYER_HEIGHT gives the top of the layer "slot"
        const layerTopY = PADDING_Y + (layerIndex * LAYER_HEIGHT);
        const componentsY = layerTopY + LAYER_PADDING_Y; // Push components down to clear label

        const count = layer.components.length;
        if (count === 0) return;

        // Distribute components horizontally
        // Available width for distribution
        const totalContentWidth = count * COMPONENT_WIDTH + (count - 1) * COMPONENT_GAP_X;
        const startX = (CANVAS_WIDTH - totalContentWidth) / 2;

        layer.components.forEach((comp, compIndex) => {
            const x = startX + (compIndex * (COMPONENT_WIDTH + COMPONENT_GAP_X));

            positionedComponents.push({
                ...comp,
                x,
                y: componentsY,
                width: COMPONENT_WIDTH,
                height: COMPONENT_HEIGHT
            });
        });
    });

    // Map remaining unlayered components (fallback)
    const layeredIds = new Set(layersWithComponents.flatMap(l => l.componentIds));
    const unlayered = architecture.components.filter(c => !layeredIds.has(c.id));

    // Position unlayered components at the bottom
    const bottomY = PADDING_Y + (layersWithComponents.length * LAYER_HEIGHT) + 40;
    unlayered.forEach((comp, i) => {
        positionedComponents.push({
            ...comp,
            x: PADDING_X + (i * (COMPONENT_WIDTH + COMPONENT_GAP_X)),
            y: bottomY,
            width: COMPONENT_WIDTH,
            height: COMPONENT_HEIGHT
        });
    });

    return {
        components: positionedComponents,
        connections: architecture.connections,
        layers: architecture.layers,
        width: CANVAS_WIDTH,
        height: Math.max(800, bottomY + COMPONENT_HEIGHT + PADDING_Y),
        layerHeight: LAYER_HEIGHT, // Pass config to renderer
        layerPaddingY: LAYER_PADDING_Y
    };
};

function App() {
    const [systemName, setSystemName] = useState('');
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [diagramData, setDiagramData] = useState(null);
    const [scale, setScale] = useState(1);

    const [refinementPrompt, setRefinementPrompt] = useState('');
    const [isRefining, setIsRefining] = useState(false);

    const generateDiagram = async (isRefinement = false) => {
        const promptText = isRefinement ? refinementPrompt : `System: ${systemName}\n\nDescription: ${description}`;

        if (!promptText) {
            setError("Please provide a description or refinement request");
            return;
        }

        setError(null);
        if (isRefinement) setIsRefining(true);
        else setLoading(true);

        try {
            let jsonText = '';
            let finalPrompt = '';

            if (isRefinement) {
                // Remove visual properties from current architecture to save tokens and avoid confusing the AI
                const currentArch = { ...diagramData };
                // We actually need the original clean architecture without layout data, 
                // but for now let's just send the components and connections.
                const cleanArch = {
                    components: diagramData.components.map(({ x, y, width, height, ...rest }) => rest),
                    connections: diagramData.connections,
                    layers: diagramData.layers
                };

                finalPrompt = `
Current Architecture: ${JSON.stringify(cleanArch)}

User Modification Request: ${refinementPrompt}

Instructions: Update the architecture based strictly on the user's modification request. Maintain the existing structure unless asked to change it. Return the full valid JSON object for the updated architecture.
`;
            } else {
                finalPrompt = `System: ${systemName}\n\nDescription: ${description}`;
            }

            if (window.ai) {
                const response = await window.ai.generate({
                    messages: [
                        { role: 'system', content: SYSTEM_PROMPT },
                        { role: 'user', content: finalPrompt }
                    ],
                    temperature: 0.3,
                    model: 'gemini-3-flash-preview'
                });
                jsonText = response.text;
            } else {
                const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
                if (!apiKey || apiKey === 'your_api_key_here') {
                    throw new Error('window.ai is not available and VITE_GEMINI_API_KEY is not set.');
                }

                const genAI = new GoogleGenerativeAI(apiKey);
                const model = genAI.getGenerativeModel({
                    model: "gemini-3-flash-preview",
                    systemInstruction: SYSTEM_PROMPT
                }, { apiVersion: 'v1beta' });

                const result = await model.generateContent(finalPrompt);
                const response = await result.response;
                jsonText = response.text();
            }

            // Strip markdown code blocks if present
            if (jsonText.startsWith('```')) {
                jsonText = jsonText.replace(/^```json\n?/, '').replace(/\n?```$/, '');
            }

            console.log("Raw AI Response:", jsonText);
            const architecture = JSON.parse(jsonText);
            console.log("Parsed Architecture:", architecture);

            if (!architecture.components || !architecture.connections) {
                throw new Error("Invalid response format from AI");
            }

            const layout = calculateLayout(architecture);
            setDiagramData(layout);
            if (isRefinement) setRefinementPrompt(''); // Clear input on success
        } catch (err) {
            console.error("Generation Error:", err);
            let msg = err.message || "Failed to generate diagram";

            if (msg.includes('429') || msg.includes('quota') || msg.includes('Too Many Requests')) {
                msg = "⚠️ High traffic volume. Please wait 30-60 seconds and try again. (API Rate Limit Reached)";
            } else if (msg.includes('503')) {
                msg = "⚠️ AI Service temporarily unavailable. Please try again later.";
            }

            setError(msg);
        } finally {
            setLoading(false);
            setIsRefining(false);
        }
    };

    const loadExample = () => {
        setSystemName(EXAMPLE_DATA.name);
        setDescription(EXAMPLE_DATA.description);
        setError(null);
    };

    const handleZoomIn = () => setScale(prev => Math.min(prev + 0.2, 3.0));
    const handleZoomOut = () => setScale(prev => Math.max(prev - 0.2, 0.5));

    const handleDownload = () => {
        const svgElement = document.getElementById('architecture-diagram');
        if (!svgElement) return;

        const serializer = new XMLSerializer();
        const source = serializer.serializeToString(svgElement);
        const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `${systemName.replace(/\s+/g, '-').toLowerCase()}-architecture.svg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="app-container">
            <header className="app-header">
                <h1 className="app-title">
                    <Network size={48} className="text-purple-300" />
                    Architecture Diagram Generator
                </h1>
                <p className="app-subtitle">Powered by Antigravity Built-in AI</p>
            </header>

            <main>
                {/* Input Section */}
                <div className="input-card">
                    <div className="form-group">
                        <label className="form-label">System Name</label>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="e.g. Payment Gateway Service"
                            value={systemName}
                            onChange={(e) => setSystemName(e.target.value)}
                            disabled={loading}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">System Description</label>
                        <textarea
                            className="form-input form-textarea"
                            placeholder="Describe your system architecture, components, and data flow..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            disabled={loading}
                        />
                    </div>

                    {error && (
                        <div className="error-banner">
                            <AlertCircle size={20} />
                            <span>{error}</span>
                        </div>
                    )}

                    <div className="button-group">
                        <button
                            className="btn btn-primary"
                            onClick={() => generateDiagram(false)}
                            disabled={loading || isRefining || !systemName || !description}
                        >
                            {loading ? <Loader2 className="spinner" /> : <Play size={20} />}
                            {loading ? 'Generating...' : 'Generate Diagram'}
                        </button>
                        <button
                            className="btn btn-secondary"
                            onClick={loadExample}
                            disabled={loading || isRefining}
                        >
                            <FileText size={20} />
                            Load Example
                        </button>
                    </div>
                </div>

                {/* Refinement Section - Only show when diagram exists */}
                {diagramData && (
                    <div className="input-card" style={{ marginTop: '20px', borderLeft: '4px solid #8b5cf6' }}>
                        <div className="form-group">
                            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <AlertCircle size={16} className="text-purple-600" />
                                Refine Architecture
                            </label>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="e.g. Add a Redis cache to the API layer, or change the Database to DynamoDB..."
                                    value={refinementPrompt}
                                    onChange={(e) => setRefinementPrompt(e.target.value)}
                                    disabled={isRefining || loading}
                                    onKeyDown={(e) => e.key === 'Enter' && generateDiagram(true)}
                                    style={{ flex: 1 }}
                                />
                                <button
                                    className="btn btn-primary"
                                    onClick={() => generateDiagram(true)}
                                    disabled={isRefining || loading || !refinementPrompt}
                                    style={{ whiteSpace: 'nowrap', minWidth: '120px' }}
                                >
                                    {isRefining ? <Loader2 className="spinner" /> : null}
                                    {isRefining ? 'Updating...' : 'Update'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Diagram Section */}
                {diagramData && (
                    <div className="diagram-card">
                        <div className="diagram-header">
                            <div className="flex items-center gap-2 font-bold text-gray-700">
                                <Layers size={24} />
                                <span>Generated Architecture</span>
                            </div>
                            <div className="diagram-controls">
                                <button className="control-btn" onClick={handleZoomIn} title="Zoom In">
                                    <ZoomIn size={20} />
                                </button>
                                <button className="control-btn" onClick={handleZoomOut} title="Zoom Out">
                                    <ZoomOut size={20} />
                                </button>
                                <button className="control-btn" onClick={handleDownload} title="Download SVG">
                                    <Download size={20} />
                                </button>
                            </div>
                        </div>

                        <div className="diagram-viewport">
                            <div className="canvas-container" style={{ transform: `scale(${scale})` }}>
                                <svg
                                    id="architecture-diagram"
                                    width={diagramData.width}
                                    height={diagramData.height}
                                    viewBox={`0 0 ${diagramData.width} ${diagramData.height}`}
                                    preserveAspectRatio="xMidYMid meet"
                                >
                                    <defs>
                                        <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                                            <polygon points="0 0, 10 3.5, 0 7" fill="#6b7280" />
                                        </marker>
                                        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                                            <feDropShadow dx="2" dy="2" stdDeviation="3" floodOpacity="0.1" />
                                        </filter>
                                    </defs>

                                    <rect width="100%" height="100%" fill="white" />

                                    {/* Layer Backgrounds */}
                                    {diagramData.layers && diagramData.layers.map((layer, i) => {
                                        // Use dimensions from layout engine or defaults
                                        const layerH = diagramData.layerHeight || 220;
                                        const paddingY = 40; // Match PADDING_Y in layout
                                        const topY = paddingY + (i * layerH);

                                        return (
                                            <g key={`layer-bg-${i}`}>
                                                <rect
                                                    x="20"
                                                    y={topY}
                                                    width={diagramData.width - 40}
                                                    height={layerH - 20} // Slight gap between layers
                                                    fill={i % 2 === 0 ? "#f3f4f6" : "#ffffff"}
                                                    rx="10"
                                                />
                                                <text
                                                    x="40"
                                                    y={topY + 30} // Fixed indent from top of layer
                                                    fill="#9ca3af"
                                                    fontSize="14"
                                                    fontWeight="bold"
                                                    textAnchor="start"
                                                    style={{ textTransform: 'uppercase', letterSpacing: '1px' }}
                                                >
                                                    {layer.name} LAYER
                                                </text>
                                            </g>
                                        );
                                    })}

                                    {/* Title */}
                                    <text x={diagramData.width / 2} y="40" textAnchor="middle" fontSize="24" fontWeight="bold" fill="#374151">
                                        {systemName} Architecture
                                    </text>

                                    {/* Connections */}
                                    {diagramData.connections.map((conn, i) => {
                                        const fromComp = diagramData.components.find(c => c.id === conn.from);
                                        const toComp = diagramData.components.find(c => c.id === conn.to);
                                        if (!fromComp || !toComp) return null;

                                        const startX = fromComp.x + (fromComp.width / 2);
                                        const startY = fromComp.y + fromComp.height; // From bottom
                                        // Simple pathing: usually down. If same layer, maybe side? 
                                        // Let's assume strict layers mostly, so connect center-bottom to center-top

                                        // But if logic allows same layer, we might want center-right to center-left?
                                        // Let's stick to center-center logic but customized ports

                                        let x1 = fromComp.x + (fromComp.width / 2);
                                        let y1 = fromComp.y + (fromComp.height / 2);
                                        let x2 = toComp.x + (toComp.width / 2);
                                        let y2 = toComp.y + (toComp.height / 2);

                                        // Adjust ports slightly based on relative position
                                        if (Math.abs(y1 - y2) > 50) {
                                            // Vertical
                                            if (y1 < y2) { y1 += fromComp.height / 2; y2 -= toComp.height / 2; }
                                            else { y1 -= fromComp.height / 2; y2 += toComp.height / 2; }
                                        } else {
                                            // Horizontal side-by-side
                                            if (x1 < x2) { x1 += fromComp.width / 2; x2 -= toComp.width / 2; }
                                            else { x1 -= fromComp.width / 2; x2 += toComp.width / 2; }
                                        }

                                        return (
                                            <g key={`conn-${i}`}>
                                                <path
                                                    d={`M ${x1} ${y1} L ${x2} ${y2}`}
                                                    stroke="#6b7280"
                                                    strokeWidth="2"
                                                    strokeDasharray={conn.type === 'async' ? "5,5" : "none"}
                                                    markerEnd="url(#arrowhead)"
                                                />
                                                <rect
                                                    x={(x1 + x2) / 2 - 30}
                                                    y={(y1 + y2) / 2 - 10}
                                                    width="60"
                                                    height="20"
                                                    fill="white"
                                                    opacity="0.8"
                                                />
                                                <text
                                                    x={(x1 + x2) / 2}
                                                    y={(y1 + y2) / 2 + 4}
                                                    textAnchor="middle"
                                                    fontSize="10"
                                                    fill="#4b5563"
                                                >
                                                    {conn.label}
                                                </text>
                                            </g>
                                        );
                                    })}

                                    {/* Components */}
                                    {diagramData.components.map((comp) => {
                                        const colors = getComponentColor(comp.type);
                                        return (
                                            <g key={comp.id} transform={`translate(${comp.x}, ${comp.y})`}>
                                                <rect
                                                    width={comp.width}
                                                    height={comp.height}
                                                    fill={colors.bg}
                                                    stroke={colors.border}
                                                    strokeWidth="2"
                                                    rx="8"
                                                    filter="url(#shadow)"
                                                />
                                                <foreignObject x="0" y="0" width={comp.width} height={comp.height}>
                                                    <div style={{
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        height: '100%',
                                                        color: 'white',
                                                        textAlign: 'center',
                                                        padding: '4px'
                                                    }}>
                                                        <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '2px' }}>{comp.name}</div>
                                                        <div style={{ fontSize: '10px', opacity: 0.9, textTransform: 'uppercase' }}>{comp.type}</div>
                                                        {comp.technologies && (
                                                            <div style={{ fontSize: '9px', marginTop: '4px', opacity: 0.8, display: 'flex', gap: '2px', flexWrap: 'wrap', justifyContent: 'center' }}>
                                                                {comp.technologies.slice(0, 3).map(t => (
                                                                    <span key={t} style={{ background: 'rgba(0,0,0,0.2)', padding: '1px 3px', borderRadius: '4px' }}>{t}</span>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </foreignObject>
                                            </g>
                                        );
                                    })}
                                </svg>
                            </div>
                        </div>

                        <div className="legend">
                            {Object.entries(COMPONENT_COLORS).map(([type, colors]) => (
                                type !== 'default' && (
                                    <div key={type} className="legend-item">
                                        <div className="legend-color" style={{ background: colors.bg, border: `1px solid ${colors.border}` }}></div>
                                        <span style={{ textTransform: 'capitalize' }}>{type}</span>
                                    </div>
                                )
                            ))}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}

export default App;
