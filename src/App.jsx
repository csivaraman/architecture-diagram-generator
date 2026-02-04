import React, { useState, useRef } from 'react';
import { Loader2, Sparkles, Network, Download, ZoomIn, ZoomOut, AlertCircle, Activity } from 'lucide-react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import RateLimiter from './RateLimiter';

const ArchitectureDiagramGenerator = () => {
    const [systemName, setSystemName] = useState('');
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);
    const [diagram, setDiagram] = useState(null);
    const [zoom, setZoom] = useState(1);
    const [error, setError] = useState(null);
    const [stats, setStats] = useState(null);
    const [currentModel, setCurrentModel] = useState('');

    // Initialize rate limiter once
    const rateLimiterRef = useRef(null);

    if (!rateLimiterRef.current) {
        const apiKeys = [
            import.meta.env.VITE_GEMINI_API_KEY_1,
            import.meta.env.VITE_GEMINI_API_KEY_2,
            import.meta.env.VITE_GEMINI_API_KEY_3,
            import.meta.env.VITE_GEMINI_API_KEY_4,
            import.meta.env.VITE_GEMINI_API_KEY_5,
        ].filter(Boolean); // Remove any undefined keys

        if (apiKeys.length === 0) {
            console.error('No API keys found! Please add them to .env.local');
        }

        rateLimiterRef.current = new RateLimiter(apiKeys);
    }

    const SYSTEM_PROMPT = `You are an expert solution architect. Analyze the provided system description and return ONLY a valid JSON object with no markdown formatting, no code blocks, no explanation. Just pure JSON.

Your response must have this exact structure:

{
  "components": [
    {
      "id": "unique-id",
      "name": "Component Name",
      "type": "user|frontend|backend|database|cache|queue|api|service|external",
      "description": "Brief description",
      "technologies": ["tech1", "tech2"]
    }
  ],
  "connections": [
    {
      "from": "component-id",
      "to": "component-id",
      "label": "HTTP/HTTPS/gRPC/etc",
      "type": "sync|async|bidirectional"
    }
  ],
  "layers": [
    {
      "name": "Client|Presentation|Application|Data|Infrastructure",
      "componentIds": ["id1", "id2"]
    }
  ]
}

Identify all major components, their relationships, and organize them into logical architectural layers. If the system has end users, web browsers, or mobile apps that interact with the system, include them as "user" type components in a "Client" layer at the top. Common layer names: Client (users, browsers, mobile apps), Presentation (frontend apps, UI), Application (backend services, APIs), Data (databases, caches), Infrastructure (queues, external services).`;

    const generateDiagram = async () => {
        if (!systemName || !description) {
            setError('Please provide both system name and description');
            return;
        }

        const rateLimiter = rateLimiterRef.current;
        if (!rateLimiter || rateLimiter.apiKeys.length === 0) {
            setError('No API keys configured. Please add them to .env.local file');
            return;
        }

        setLoading(true);
        setError(null);

        const MAX_RETRIES = 3;
        let retryCount = 0;

        while (retryCount < MAX_RETRIES) {
            try {
                // Estimate tokens (rough estimate: ~4 chars per token)
                const promptText = SYSTEM_PROMPT + systemName + description;
                const estimatedTokens = Math.ceil(promptText.length / 4) + 2000; // +2000 for response

                // Get optimal key and model
                const { keyIndex, model } = await rateLimiter.getKeyAndModel(estimatedTokens);
                const apiKey = rateLimiter.apiKeys[keyIndex];

                setCurrentModel(`${model} (Key ${keyIndex + 1}/5)`);
                console.log(`Using ${model} with API key ${keyIndex + 1}`);

                // Initialize Gemini with selected key and model
                const genAI = new GoogleGenerativeAI(apiKey);
                const geminiModel = genAI.getGenerativeModel({
                    model: model
                });

                // Generate content
                const result = await geminiModel.generateContent({
                    contents: [{
                        role: 'user',
                        parts: [{
                            text: `${SYSTEM_PROMPT}\n\nSystem Name: ${systemName}\n\nDescription: ${description}\n\nGenerate the architecture JSON.`
                        }]
                    }]
                });

                const response = await result.response;
                const text = response.text();

                // Record successful request
                const actualTokens = estimatedTokens; // In production, use response.usageMetadata
                rateLimiter.recordRequest(keyIndex, model, actualTokens);

                // Update stats
                setStats(rateLimiter.getStats());

                // Parse JSON
                const cleanedContent = text
                    .replace(/```json\n?/g, '')
                    .replace(/```\n?/g, '')
                    .trim();

                let architecture;
                try {
                    architecture = JSON.parse(cleanedContent);
                } catch (parseError) {
                    console.error('Raw response:', text);
                    throw new Error('Failed to parse architecture JSON. Please try again.');
                }

                if (!architecture.components || !architecture.connections || !architecture.layers) {
                    throw new Error('Invalid architecture structure returned');
                }

                const visualDiagram = layoutDiagram(architecture, systemName);
                setDiagram(visualDiagram);
                setLoading(false);
                return; // Success!

            } catch (err) {
                console.error(`Attempt ${retryCount + 1} failed:`, err);

                // Check if it's a rate limit error
                if (err.message && (err.message.includes('429') || err.message.includes('quota') || err.message.includes('RESOURCE_EXHAUSTED'))) {
                    retryCount++;
                    if (retryCount < MAX_RETRIES) {
                        const waitTime = Math.pow(2, retryCount) * 1000; // Exponential backoff
                        console.log(`Rate limit hit. Waiting ${waitTime / 1000}s before retry ${retryCount}/${MAX_RETRIES}...`);
                        await rateLimiter.sleep(waitTime);
                        continue;
                    }
                }

                setError(`Failed to generate diagram: ${err.message}`);
                setLoading(false);
                return;
            }
        }

        setError('Maximum retries exceeded. Please try again in a minute.');
        setLoading(false);
    };

    const layoutDiagram = (architecture, systemName) => {
        const COMPONENT_WIDTH = 180;
        const COMPONENT_HEIGHT = 80;
        const COMPONENT_GAP_X = 60;
        const LAYER_HEIGHT = 200;
        const PADDING_TOP = 100; // Extra space for title
        const PADDING_SIDE = 80;
        const LAYER_LABEL_HEIGHT = 40;

        // 1. Calculate Dynamic Canvas Width
        let maxComponentsInLayer = 0;
        architecture.layers.forEach(layer => {
            maxComponentsInLayer = Math.max(maxComponentsInLayer, layer.componentIds.length);
        });

        const calculatedWidth = (maxComponentsInLayer * (COMPONENT_WIDTH + COMPONENT_GAP_X)) + (PADDING_SIDE * 2);
        const width = Math.max(1200, calculatedWidth);
        const height = PADDING_TOP + (architecture.layers.length * LAYER_HEIGHT);

        const components = architecture.components.map(comp => {
            const layerIndex = architecture.layers.findIndex(layer =>
                layer.componentIds.includes(comp.id)
            );

            const layer = architecture.layers[layerIndex] || architecture.layers[0];
            const componentsInLayer = layer.componentIds.length;
            const indexInLayer = layer.componentIds.indexOf(comp.id);

            // Center components in the layer
            const totalLayerContentWidth = componentsInLayer * COMPONENT_WIDTH + (componentsInLayer - 1) * COMPONENT_GAP_X;
            const startX = (width - totalLayerContentWidth) / 2;

            return {
                ...comp,
                x: startX + indexInLayer * (COMPONENT_WIDTH + COMPONENT_GAP_X) + COMPONENT_WIDTH / 2,
                y: PADDING_TOP + (layerIndex * LAYER_HEIGHT) + LAYER_LABEL_HEIGHT + (LAYER_HEIGHT - LAYER_LABEL_HEIGHT) / 2,
                width: COMPONENT_WIDTH,
                height: COMPONENT_HEIGHT
            };
        });

        return {
            systemName,
            width,
            height,
            components,
            connections: architecture.connections,
            layers: architecture.layers,
            layerHeight: LAYER_HEIGHT,
            paddingTop: PADDING_TOP,
            layerLabelHeight: LAYER_LABEL_HEIGHT
        };
    };

    const getComponentColor = (type) => {
        const colors = {
            frontend: { bg: '#3b82f6', border: '#2563eb' },
            backend: { bg: '#10b981', border: '#059669' },
            database: { bg: '#f59e0b', border: '#d97706' },
            cache: { bg: '#ec4899', border: '#db2777' },
            queue: { bg: '#8b5cf6', border: '#7c3aed' },
            api: { bg: '#06b6d4', border: '#0891b2' },
            service: { bg: '#14b8a6', border: '#0d9488' },
            external: { bg: '#6b7280', border: '#4b5563' }
        };
        return colors[type] || colors.service;
    };

    const downloadSVG = () => {
        if (!diagram) return;
        const svgElement = document.getElementById('architecture-svg');
        const svgData = new XMLSerializer().serializeToString(svgElement);
        const blob = new Blob([svgData], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${diagram.systemName.replace(/\s+/g, '-')}-architecture.svg`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const loadExample = () => {
        setSystemName('E-Commerce Platform');
        setDescription('A scalable e-commerce platform with microservices architecture. Users can browse products, add items to cart, and checkout. The system includes product catalog, user authentication, payment processing, order management, and inventory tracking. Uses React frontend, Node.js microservices, PostgreSQL for transactional data, Redis for caching, and RabbitMQ for async communication between services.');
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: '2rem',
            fontFamily: '"Space Grotesk", system-ui, sans-serif'
        }}>
            <style>
                {`
          @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap');
          @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.6; }
          }
        `}
            </style>

            <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: '3rem', animation: 'fadeInUp 0.6s ease-out' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                        <Network size={48} color="white" />
                        <h1 style={{ fontSize: '3.5rem', color: 'white', margin: 0, fontWeight: 700, textShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
                            Architecture Diagram Generator
                        </h1>
                    </div>
                    <p style={{ fontSize: '1.25rem', color: 'rgba(255,255,255,0.9)', maxWidth: '600px', margin: '0 auto' }}>
                        Transform natural language descriptions into detailed solution architecture diagrams
                    </p>
                    <p style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.8)', marginTop: '0.5rem' }}>
                        Powered by Gemini with Smart Rate Limiting (5 API Keys, 2 Models)
                    </p>
                </div>

                {/* Stats Panel */}
                {stats && (
                    <div style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', borderRadius: '16px', padding: '1rem', marginBottom: '2rem', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Activity size={20} />
                            <span>Current Model: {currentModel}</span>
                        </div>
                        <div>
                            Total Requests Today: {stats.totalDailyRequests}
                        </div>
                        <div>
                            Keys Active: {stats.keys.filter(k => k.flash.rpd > 0 || k.flashLite.rpd > 0).length}/5
                        </div>
                    </div>
                )}

                {/* Input Form */}
                <div style={{ background: 'white', borderRadius: '20px', padding: '2.5rem', marginBottom: '2rem', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', animation: 'fadeInUp 0.6s ease-out 0.1s both' }}>
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', fontSize: '0.95rem', fontWeight: 600, color: '#1f2937', marginBottom: '0.5rem' }}>
                            System Name
                        </label>
                        <input
                            type="text"
                            value={systemName}
                            onChange={(e) => setSystemName(e.target.value)}
                            placeholder="e.g., E-Commerce Platform"
                            style={{ width: '100%', padding: '1rem', fontSize: '1rem', border: '2px solid #e5e7eb', borderRadius: '12px', transition: 'all 0.2s', outline: 'none' }}
                            onFocus={(e) => e.target.style.borderColor = '#667eea'}
                            onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                        />
                    </div>

                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', fontSize: '0.95rem', fontWeight: 600, color: '#1f2937', marginBottom: '0.5rem' }}>
                            System Description
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Describe your system architecture, components, technologies, and how they interact..."
                            rows={6}
                            style={{ width: '100%', padding: '1rem', fontSize: '1rem', border: '2px solid #e5e7eb', borderRadius: '12px', transition: 'all 0.2s', outline: 'none', resize: 'vertical', fontFamily: 'inherit' }}
                            onFocus={(e) => e.target.style.borderColor = '#667eea'}
                            onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                        <button
                            onClick={generateDiagram}
                            disabled={loading}
                            style={{ flex: 1, minWidth: '200px', padding: '1rem 2rem', fontSize: '1.1rem', fontWeight: 600, color: 'white', background: loading ? '#9ca3af' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', border: 'none', borderRadius: '12px', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', transition: 'all 0.2s', boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)' }}
                            onMouseOver={(e) => !loading && (e.target.style.transform = 'translateY(-2px)')}
                            onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
                        >
                            {loading ? (
                                <>
                                    <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
                                    Generating with Gemini...
                                </>
                            ) : (
                                <>
                                    <Sparkles size={20} />
                                    Generate Diagram
                                </>
                            )}
                        </button>

                        <button
                            onClick={loadExample}
                            disabled={loading}
                            style={{ padding: '1rem 2rem', fontSize: '1rem', fontWeight: 600, color: '#667eea', background: 'white', border: '2px solid #667eea', borderRadius: '12px', cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }}
                            onMouseOver={(e) => !loading && (e.target.style.background = '#f3f4f6')}
                            onMouseOut={(e) => e.target.style.background = 'white'}
                        >
                            Load Example
                        </button>
                    </div>

                    {error && (
                        <div style={{ marginTop: '1rem', padding: '1rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#991b1b', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                            <AlertCircle size={20} style={{ flexShrink: 0, marginTop: '0.125rem' }} />
                            <div>{error}</div>
                        </div>
                    )}
                </div>

                {/* Diagram Display - Same as before, truncated for brevity */}
                {diagram && (
                    <div style={{ background: 'white', borderRadius: '20px', padding: '2rem', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '2px solid #f3f4f6', flexWrap: 'wrap', gap: '1rem' }}>
                            <h2 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1f2937', margin: 0 }}>
                                {diagram.systemName}
                            </h2>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button onClick={() => setZoom(Math.min(zoom + 0.2, 3))} style={{ padding: '0.5rem', background: '#f3f4f6', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                                    <ZoomIn size={20} />
                                </button>
                                <button onClick={() => setZoom(Math.max(zoom - 0.2, 0.5))} style={{ padding: '0.5rem', background: '#f3f4f6', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                                    <ZoomOut size={20} />
                                </button>
                                <button onClick={downloadSVG} style={{ padding: '0.5rem 1rem', background: '#667eea', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
                                    <Download size={20} />
                                    Download SVG
                                </button>
                            </div>
                        </div>
                        <div style={{ overflow: 'auto', background: '#f9fafb', borderRadius: '12px', padding: '2rem' }}>
                            <svg id="architecture-svg" width={diagram.width} height={diagram.height} style={{ transform: `scale(${zoom})`, transformOrigin: 'top left', transition: 'transform 0.2s' }}>
                                <rect width={diagram.width} height={diagram.height} fill="white" />

                                {diagram.layers.map((layer, idx) => {
                                    const layerTop = diagram.paddingTop + (idx * diagram.layerHeight);
                                    return (
                                        <g key={idx}>
                                            <rect
                                                x={20}
                                                y={layerTop}
                                                width={diagram.width - 40}
                                                height={diagram.layerHeight - 20}
                                                fill={idx % 2 === 0 ? '#f8fafc' : '#f1f5f9'}
                                                stroke="#e2e8f0"
                                                strokeWidth="2"
                                                rx="12"
                                            />
                                            <text
                                                x={40}
                                                y={layerTop + 30}
                                                fontSize="14"
                                                fontWeight="700"
                                                fill="#64748b"
                                                style={{ textTransform: 'uppercase', letterSpacing: '1px' }}
                                            >
                                                {layer.name} LAYER
                                            </text>
                                        </g>
                                    );
                                })}

                                <defs>
                                    <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                                        <polygon points="0 0, 10 3, 0 6" fill="#64748b" />
                                    </marker>
                                    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                                        <feDropShadow dx="2" dy="2" stdDeviation="3" floodOpacity="0.1" />
                                    </filter>
                                </defs>

                                {diagram.connections.map((conn, idx) => {
                                    const fromComp = diagram.components.find(c => c.id === conn.from);
                                    const toComp = diagram.components.find(c => c.id === conn.to);
                                    if (!fromComp || !toComp) return null;

                                    const x1 = fromComp.x;
                                    const y1 = fromComp.y + fromComp.height / 2;
                                    const x2 = toComp.x;
                                    const y2 = toComp.y - toComp.height / 2;

                                    // Jitter midY based on index to separate parallel lines
                                    // Also account for the gap between layers
                                    const baseMidY = (y1 + y2) / 2;
                                    const jitter = (idx % 5 - 2) * 20; // -40, -20, 0, 20, 40 offset
                                    const midY = baseMidY + jitter;

                                    // Stagger labels horizontally to avoid stacking
                                    const labelX = (x1 + x2) / 2 + ((idx % 3 - 1) * 60);

                                    return (
                                        <g key={idx}>
                                            <path
                                                d={`M ${x1} ${y1} L ${x1} ${midY} L ${x2} ${midY} L ${x2} ${y2}`}
                                                stroke="#64748b"
                                                strokeWidth="1.5"
                                                fill="none"
                                                markerEnd="url(#arrowhead)"
                                                strokeDasharray={conn.type === 'async' ? '5,5' : '0'}
                                                style={{ opacity: 0.6 }}
                                            />
                                            <g transform={`translate(${labelX}, ${midY})`}>
                                                <rect
                                                    x="-40"
                                                    y="-10"
                                                    width="80"
                                                    height="20"
                                                    fill="white"
                                                    rx="4"
                                                    stroke="#e2e8f0"
                                                    strokeWidth="1"
                                                    style={{ opacity: 0.9 }}
                                                />
                                                <text
                                                    fontSize="9"
                                                    fontWeight="600"
                                                    fill="#475569"
                                                    textAnchor="middle"
                                                    alignmentBaseline="central"
                                                    style={{ pointerEvents: 'none' }}
                                                >
                                                    {conn.label}
                                                </text>
                                            </g>
                                        </g>
                                    );
                                })}

                                {diagram.components.map((comp, idx) => {
                                    const colors = getComponentColor(comp.type);
                                    return (
                                        <g key={idx} transform={`translate(${comp.x - comp.width / 2}, ${comp.y - comp.height / 2})`}>
                                            <rect
                                                width={comp.width}
                                                height={comp.height}
                                                fill={colors.bg}
                                                stroke={colors.border}
                                                strokeWidth="2"
                                                rx="10"
                                                filter="url(#shadow)"
                                            />
                                            <foreignObject width={comp.width} height={comp.height}>
                                                <div xmlns="http://www.w3.org/1999/xhtml" style={{
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    height: '100%',
                                                    color: 'white',
                                                    textAlign: 'center',
                                                    padding: '8px'
                                                }}>
                                                    <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '2px' }}>{comp.name}</div>
                                                    <div style={{ fontSize: '10px', opacity: 0.9, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{comp.type}</div>
                                                    {comp.technologies && comp.technologies.length > 0 && (
                                                        <div style={{ fontSize: '9px', marginTop: '4px', opacity: 0.8, display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'center' }}>
                                                            {comp.technologies.slice(0, 2).map(t => (
                                                                <span key={t} style={{ background: 'rgba(0,0,0,0.2)', padding: '1px 4px', borderRadius: '4px' }}>{t}</span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </foreignObject>
                                        </g>
                                    );
                                })}

                                <text
                                    x={diagram.width / 2}
                                    y={60}
                                    fontSize="28"
                                    fontWeight="800"
                                    fill="#1f2937"
                                    textAnchor="middle"
                                >
                                    {diagram.systemName} Architecture
                                </text>
                            </svg>
                        </div>
                        <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#f9fafb', borderRadius: '8px' }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#1f2937', marginBottom: '0.75rem' }}>Component Types</h3>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
                                {['frontend', 'backend', 'database', 'cache', 'queue', 'api', 'service', 'external'].map(type => {
                                    const colors = getComponentColor(type);
                                    return (
                                        <div key={type} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <div style={{ width: '20px', height: '20px', background: colors.bg, border: `2px solid ${colors.border}`, borderRadius: '4px' }} />
                                            <span style={{ fontSize: '0.875rem', color: '#6b7280', textTransform: 'capitalize' }}>{type}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {/* Info Box */}
                <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.2)', color: 'white' }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.75rem' }}>
                        How Smart Rate Limiting Works
                    </h3>
                    <ol style={{ margin: 0, paddingLeft: '1.5rem', lineHeight: '1.8' }}>
                        <li>5 API keys rotate automatically to distribute load</li>
                        <li>Starts with Gemini 2.5 Flash (best quality)</li>
                        <li>Falls back to Flash-Lite if rate limited</li>
                        <li>Throttles requests to stay under RPM/TPM limits</li>
                        <li>Auto-retries with exponential backoff on 429 errors</li>
                        <li>100% FREE - up to 1,250 diagrams per day!</li>
                    </ol>
                </div>
            </div>
        </div >
    );
};

export default ArchitectureDiagramGenerator;