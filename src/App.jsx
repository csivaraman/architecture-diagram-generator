import React, { useState, useRef } from 'react';
import { Loader2, Sparkles, Network, Download, ZoomIn, ZoomOut, AlertCircle, Activity } from 'lucide-react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import RateLimiter from './RateLimiter';
import TestRunner from './test/TestRunner.jsx';


const RateLimitStatus = ({ stats }) => {
    if (!stats) return null;

    return (
        <div style={{
            position: 'fixed',
            bottom: '1rem',
            left: '1rem',
            zIndex: 100,
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            borderRadius: '12px',
            padding: '1rem',
            boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
            border: '1px solid rgba(0,0,0,0.05)',
            maxWidth: '300px',
            fontSize: '0.8rem'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>
                <Activity size={16} color="#667eea" />
                <span style={{ fontWeight: 700, color: '#1f2937' }}>API Health Status</span>
            </div>

            <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
                {stats.keys.map((keyStats, idx) => {
                    // Check if any model on this key is active
                    const models = Object.values(keyStats.modelUsage);
                    const isExhausted = models.every(m => m.status === 'exhausted');
                    const totalDaily = models.reduce((acc, curr) => acc + curr.rpd, 0);

                    return (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', alignItems: 'center' }}>
                            <span style={{ color: '#4b5563' }}>Key {idx + 1}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ color: '#6b7280' }}>{totalDaily} reqs</span>
                                <span style={{
                                    display: 'inline-block',
                                    width: '8px',
                                    height: '8px',
                                    borderRadius: '50%',
                                    background: isExhausted ? '#ef4444' : '#10b981'
                                }} />
                            </div>
                        </div>
                    );
                })}
            </div>
            <div style={{ marginTop: '0.5rem', fontSize: '0.7rem', color: '#9ca3af', textAlign: 'center' }}>
                Resets daily at midnight PST
            </div>
        </div>
    );
};

const ArchitectureDiagramGenerator = () => {
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);
    const [diagram, setDiagram] = useState(null);
    const [zoom, setZoom] = useState(1);
    const [error, setError] = useState(null);
    const [stats, setStats] = useState(null);
    const [currentModel, setCurrentModel] = useState('');
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [isTablet, setIsTablet] = useState(window.innerWidth >= 768 && window.innerWidth < 1024);

    React.useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
            setIsTablet(window.innerWidth >= 768 && window.innerWidth < 1024);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

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

    // Load initial stats
    React.useEffect(() => {
        if (rateLimiterRef.current) {
            setStats(rateLimiterRef.current.getStats());
        }
    }, []);

    const SYSTEM_PROMPT = `You are an expert solution architect. Analyze the provided system description and return ONLY a valid JSON object with no markdown formatting, no code blocks, no explanation. Just pure JSON.

Your response must have this exact structure:

{
  "systemName": "A short, descriptive title for the system (e.g. 'E-Commerce Platform', 'Data Processing Pipeline')",
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

    const generateDiagram = async (overrideDescription) => {
        // Handle both event objects (from button click) and direct string input (from tests)
        const descToUse = (typeof overrideDescription === 'string') ? overrideDescription : description;

        if (!descToUse) {
            setError('Please provide a system description');
            return;
        }

        const rateLimiter = rateLimiterRef.current;
        if (!rateLimiter || rateLimiter.apiKeys.length === 0) {
            setError('No API keys configured. Please add them to .env.local file');
            return;
        }

        setLoading(true);
        setError(null);

        const MAX_RETRIES = 5; // Increased retries since we might switch keys/models
        let retryCount = 0;

        // Keep track of current attempt details for error handling
        let persistentAvailable = null;
        let currentKeyIndex = -1;
        let currentModelName = '';

        while (retryCount < MAX_RETRIES) {
            try {
                // Estimate tokens (rough estimate: ~4 chars per token)
                const promptText = SYSTEM_PROMPT + descToUse;
                const estimatedTokens = Math.ceil(promptText.length / 4) + 2000; // +2000 for response

                // Get optimal key and model (use previous if it was a 503 retry)
                const available = persistentAvailable || await rateLimiter.getKeyAndModel(estimatedTokens);
                persistentAvailable = null; // Clear it for next time

                if (!available) {
                    throw new Error('Daily generation limit reached for all available free models. Please try again in 24 hours or provide your own API key in the configuration.');
                }

                const { keyIndex, model } = available;
                currentKeyIndex = keyIndex;
                currentModelName = model;

                const apiKey = rateLimiter.apiKeys[keyIndex];

                setCurrentModel(`${model} (Key ${keyIndex + 1}/5)`);
                console.log(`%c[GenAI Request] Using Model: ${model} | API Key Index: ${keyIndex + 1}`, 'color: #3b82f6; font-weight: bold;');

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
                            text: `${SYSTEM_PROMPT}\n\nDescription: ${descToUse}\n\nGenerate the architecture JSON.`
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

                // Use generated system name or fallback
                const generatedSystemName = architecture.systemName || 'System Architecture';
                const visualDiagram = layoutDiagram(architecture, generatedSystemName);
                setDiagram(visualDiagram);
                setLoading(false);
                return; // Success!

            } catch (err) {
                console.error(`Attempt ${retryCount + 1} failed:`, err);

                // Handle 503 Model Overloaded specifically (Retry same key/model after 10s)
                const errorMsg = err.message || '';
                if (errorMsg.includes('503') || errorMsg.toLowerCase().includes('overloaded')) {
                    retryCount++;
                    if (retryCount < MAX_RETRIES) {
                        console.log(`%c[GenAI Retry] Model overloaded (503). Retrying after 10s delay with Key ${currentKeyIndex + 1}...`, 'color: #f59e0b; font-weight: bold;');

                        // Keep the same key and model for retry
                        persistentAvailable = { keyIndex: currentKeyIndex, model: currentModelName };

                        // Wait 10 seconds as requested
                        await new Promise(resolve => setTimeout(resolve, 10000));
                        continue;
                    }
                }

                // Check if it's a rate limit error (429)
                if (errorMsg.includes('429') || errorMsg.toLowerCase().includes('quota') || errorMsg.includes('RESOURCE_EXHAUSTED')) {
                    // Critical: Report this to the rate limiter so it doesn't give us the same key/model again
                    if (currentKeyIndex !== -1 && currentModelName) {
                        rateLimiter.reportQuotaExceeded(currentKeyIndex, currentModelName);
                    }

                    retryCount++;
                    if (retryCount < MAX_RETRIES) {
                        const waitTime = 1000; // Short wait, we want to try next key immediately
                        console.log(`Rate limit hit on Key ${currentKeyIndex + 1}. Switching keys/models...`);
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
        const COMPONENT_WIDTH = isMobile ? 140 : (isTablet ? 160 : 180);
        const COMPONENT_HEIGHT = isMobile ? 70 : 80;
        const COMPONENT_GAP_X = isMobile ? 30 : (isTablet ? 45 : 60);
        const LAYER_HEIGHT = isMobile ? 180 : 200;
        const PADDING_TOP = isMobile ? 20 : 40;
        const PADDING_SIDE = isMobile ? 20 : (isTablet ? 40 : 80);
        const LAYER_LABEL_HEIGHT = 40;

        // 1. Calculate Dynamic Canvas Width
        let maxComponentsInLayer = 0;
        architecture.layers.forEach(layer => {
            maxComponentsInLayer = Math.max(maxComponentsInLayer, layer.componentIds.length);
        });

        const calculatedWidth = (maxComponentsInLayer * (COMPONENT_WIDTH + COMPONENT_GAP_X)) + (PADDING_SIDE * 2);
        const width = Math.max(isMobile ? 350 : 1200, calculatedWidth);
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
        if (!svgElement) {
            console.error('SVG element not found');
            return;
        }

        // Clone for serialization
        const clonedSvg = svgElement.cloneNode(true);
        clonedSvg.setAttribute('version', '1.1');
        clonedSvg.setAttribute('baseProfile', 'full');
        clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        clonedSvg.setAttribute('xmlns:xhtml', 'http://www.w3.org/1999/xhtml');

        // Serialize to XML
        const serializer = new XMLSerializer();
        let svgData = serializer.serializeToString(clonedSvg);

        if (!svgData.startsWith('<?xml')) {
            svgData = '<?xml version="1.0" standalone="no"?>\n' + svgData;
        }

        // Alternative Method: Data URI (Base64)
        // This embeds the file directly into the link, bypassing Blob management
        const base64Data = btoa(unescape(encodeURIComponent(svgData)));
        const dataUri = `data:image/svg+xml;base64,${base64Data}`;

        // Sanitize filename
        const safeName = diagram.systemName
            .replace(/[^\w\s-]/g, '')
            .trim()
            .replace(/\s+/g, '-');

        const link = document.createElement('a');
        link.href = dataUri;
        link.download = `${safeName || 'architecture'}-diagram.svg`;

        document.body.appendChild(link);
        link.click();

        // Cleanup
        setTimeout(() => {
            document.body.removeChild(link);
        }, 500);
    };

    const loadExample = () => {
        setDescription('A scalable e-commerce platform with microservices architecture. Users can browse products, add items to cart, and checkout. The system includes product catalog, user authentication, payment processing, order management, and inventory tracking. Uses React frontend, Node.js microservices, PostgreSQL for transactional data, Redis for caching, and RabbitMQ for async communication between services.');
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: isMobile ? '1rem' : '2rem',
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

            {import.meta.env.DEV && (
                <div className="test-section" style={{ maxWidth: '1400px', margin: '0 auto 2rem', padding: '0 1rem' }}>
                    <TestRunner generateDiagram={generateDiagram} />
                </div>
            )}
            <div style={{ maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: isMobile ? '2rem' : '3rem', animation: 'fadeInUp 0.6s ease-out' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: isMobile ? '0.5rem' : '1rem', marginBottom: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                        <Network size={isMobile ? 32 : 48} color="white" />
                        <h1 style={{ fontSize: isMobile ? '1.75rem' : '3.5rem', color: 'white', margin: 0, fontWeight: 700, textShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
                            Architecture Diagram Generator
                        </h1>
                    </div>
                    <p style={{ fontSize: isMobile ? '1rem' : '1.25rem', color: 'rgba(255,255,255,0.9)', maxWidth: '600px', margin: '0 auto' }}>
                        Transform natural language descriptions into detailed solution architecture diagrams
                    </p>
                </div>



                {/* Input Form */}
                <div style={{ background: 'white', borderRadius: '20px', padding: isMobile ? '1.5rem' : '2.5rem', marginBottom: '2rem', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', animation: 'fadeInUp 0.6s ease-out 0.1s both' }}>

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
                    <div style={{ background: 'white', borderRadius: '20px', padding: isMobile ? '1rem' : '2rem', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            marginBottom: '1.5rem',
                            paddingBottom: '1rem',
                            borderBottom: '2px solid #f3f4f6',
                            flexDirection: isMobile ? 'column' : 'row',
                            position: 'relative',
                            gap: '1rem'
                        }}>
                            <h2 style={{ fontSize: isMobile ? '1.25rem' : '1.75rem', fontWeight: 700, color: '#1f2937', margin: 0, textAlign: 'center' }}>
                                {diagram.systemName}
                            </h2>
                            <div style={{
                                display: 'flex',
                                gap: '0.5rem',
                                position: isMobile ? 'static' : 'absolute',
                                right: isMobile ? 'auto' : 0
                            }}>
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
                            <svg
                                id="architecture-svg"
                                xmlns="http://www.w3.org/2000/svg"
                                version="1.1"
                                baseProfile="full"
                                width={diagram.width}
                                height={diagram.height}
                                style={{ transform: `scale(${zoom})`, transformOrigin: 'top left', transition: 'transform 0.2s' }}
                            >
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

                {/* Footer Note */}
                <div style={{ marginTop: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}>
                    Powered by Google Gemini • Prototyped with Antigravity
                </div>
            </div>

            {/* <RateLimitStatus stats={stats} /> */}
        </div >
    );
};

export default ArchitectureDiagramGenerator;