import React, { useState, useRef } from 'react';
import { Loader2, Sparkles, Network, Download, ZoomIn, ZoomOut, AlertCircle, Info, AlertTriangle, Linkedin, Edit } from 'lucide-react';
import { openInDrawioWithLocalStorage } from './utils/drawioIntegration';
import TestRunner from './test/TestRunner.jsx';
import { architectureTestCases } from './data/architectureTestCases';



const ArchitectureDiagramGenerator = () => {
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);
    const [diagram, setDiagram] = useState(null);
    const [zoom, setZoom] = useState(1);
    const [provider, setProvider] = useState('gemini');
    const [error, setError] = useState(null);
    const [quotaError, setQuotaError] = useState(false);
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



    const generateDiagram = async (overrideDescription) => {
        // Handle both event objects (from button click) and direct string input (from tests)
        const descToUse = (typeof overrideDescription === 'string') ? overrideDescription : description;

        if (!descToUse) {
            setError('Please provide a system description');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/generate-diagram', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ systemDescription: descToUse, provider }),
            });

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'Failed to generate diagram');
            }

            const architecture = result.diagram;
            const fromCache = result.fromCache;

            if (fromCache) {
                console.log(`%c[Cache Hit] Received diagram from backend cache for ${provider.toUpperCase()}`, 'color: #10b981; font-weight: bold;');
            } else {
                const { keyId, model, provider: diagProvider } = result.diagnostics || {};
                console.log(
                    `%c[Service Request] Received fresh diagram from ${diagProvider ? diagProvider.toUpperCase() : provider.toUpperCase()} (Key #${keyId || '?'}, Model: ${model || 'unknown'})`,
                    'color: #3b82f6; font-weight: bold;'
                );
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
            console.error('[Frontend] Generation Error:', err);
            const msg = err.message || '';

            // Format generic error message for UI
            let paramsDisplay = msg;

            // Extract inner message if available (e.g., [503 ...])
            const innerMatch = msg.match(/\[.*?\]\s*(.*)/);
            if (innerMatch && innerMatch[1]) {
                paramsDisplay = innerMatch[1].trim();
            }

            // Custom override for 503 Overloaded
            if (msg.includes('The model is overloaded. Please try again later.')) {
                paramsDisplay = "The model is overloaded. Please try again in 30 seconds.";
            }

            if (msg.includes('429') || msg.includes('quota') || msg.toLowerCase().includes('temporarily unavailable')) {
                setQuotaError(true);
            } else {
                setError(`Failed to generate diagram: ${paramsDisplay}`);
            }
            setLoading(false);
        }
    };

    const layoutDiagram = (architecture, systemName) => {
        const COMPONENT_WIDTH = isMobile ? 140 : (isTablet ? 160 : 180);
        const COMPONENT_HEIGHT = isMobile ? 70 : 80;
        const COMPONENT_GAP_X = isMobile ? 40 : (isTablet ? 60 : 80);
        const LAYER_HEIGHT = isMobile ? 200 : 250;
        const TITLE_SPACE = 50;
        const PADDING_TOP = (isMobile ? 40 : 60) + TITLE_SPACE;
        const PADDING_SIDE = isMobile ? 40 : (isTablet ? 60 : 100);
        const LAYER_LABEL_HEIGHT = 50;

        // 0. Pre-processing: Heal orphaned components (fix ID mismatches)
        // Find components that exist in 'components' but are missing from all 'layers'
        const allLayerComponentIds = new Set(architecture.layers.flatMap(l => l.componentIds));
        const orphanedComponents = architecture.components.filter(c => !allLayerComponentIds.has(c.id));

        if (orphanedComponents.length > 0) {
            console.warn(`[Layout] Found ${orphanedComponents.length} orphaned components. Healing...`, orphanedComponents);

            // Default to 'Application' layer (usually index 1) or the largest layer
            let targetLayerIndex = architecture.layers.findIndex(l => l.name.toLowerCase().includes('application'));
            if (targetLayerIndex === -1) targetLayerIndex = 1; // Fallback to 2nd layer
            if (targetLayerIndex >= architecture.layers.length) targetLayerIndex = 0; // Absolute fallback

            // Add orphans to the target layer
            architecture.layers[targetLayerIndex].componentIds.push(...orphanedComponents.map(c => c.id));
        }

        // 0.1 Pre-processing: Heal isolated components (No connections)
        // Check if any specific component has 0 connections
        architecture.components.forEach(comp => {
            const hasConnection = architecture.connections.some(conn => conn.from === comp.id || conn.to === comp.id);
            if (!hasConnection) {
                console.warn(`[Layout] Component ${comp.id} is isolated. Healing connection...`);

                // Heuristic: Connect to "API Gateway" or "Hub" (most connected node)
                let targetId = null;

                // Priority 1: API Gateway
                const gateway = architecture.components.find(c => c.name.toLowerCase().includes('gateway') || c.name.toLowerCase().includes('api'));
                if (gateway && gateway.id !== comp.id) {
                    targetId = gateway.id;
                } else {
                    // Priority 2: Find the 'Hub' (max connections)
                    const connectionCounts = {};
                    architecture.connections.forEach(c => {
                        connectionCounts[c.from] = (connectionCounts[c.from] || 0) + 1;
                        connectionCounts[c.to] = (connectionCounts[c.to] || 0) + 1;
                    });

                    targetId = Object.keys(connectionCounts).reduce((a, b) => connectionCounts[a] > connectionCounts[b] ? a : b, null);
                }

                if (targetId) {
                    architecture.connections.push({
                        from: targetId,
                        to: comp.id,
                        label: 'Inferred',
                        type: 'sync'
                    });
                }
            }
        });

        // 1. Sort components in layers to minimize crossings
        const layerSortedComponentIds = [];
        architecture.layers.forEach((layer, layerIdx) => {
            if (layerIdx === 0) {
                layerSortedComponentIds.push(layer.componentIds);
            } else {
                const prevLayerIds = layerSortedComponentIds[layerIdx - 1];
                // Simple heuristic: sort by average index of connected components in the previous layer
                const sortedIds = [...layer.componentIds].sort((a, b) => {
                    const getAvgPos = (compId) => {
                        const connections = architecture.connections.filter(c =>
                            (c.from === compId && prevLayerIds.includes(c.to)) ||
                            (c.to === compId && prevLayerIds.includes(c.from))
                        );
                        if (connections.length === 0) return prevLayerIds.length / 2;
                        const sum = connections.reduce((acc, c) => {
                            const otherId = c.from === compId ? c.to : c.from;
                            return acc + prevLayerIds.indexOf(otherId);
                        }, 0);
                        return sum / connections.length;
                    };
                    return getAvgPos(a) - getAvgPos(b);
                });
                layerSortedComponentIds.push(sortedIds);
            }
        });

        // 2. Calculate Dynamic Canvas Width
        let maxComponentsInLayer = 0;
        layerSortedComponentIds.forEach(ids => {
            maxComponentsInLayer = Math.max(maxComponentsInLayer, ids.length);
        });

        const calculatedWidth = (maxComponentsInLayer * (COMPONENT_WIDTH + COMPONENT_GAP_X)) + (PADDING_SIDE * 2);
        const width = Math.max(isMobile ? 350 : 1200, calculatedWidth);
        const height = PADDING_TOP + (architecture.layers.length * LAYER_HEIGHT) + 40;

        const components = architecture.components.map(comp => {
            const layerIndex = architecture.layers.findIndex(layer =>
                layer.componentIds.includes(comp.id)
            );

            const sortedIds = layerSortedComponentIds[layerIndex] || architecture.layers[layerIndex]?.componentIds || [];
            const componentsInLayer = sortedIds.length;
            const indexInLayer = sortedIds.indexOf(comp.id);

            // Center components in the layer
            const totalLayerContentWidth = componentsInLayer * COMPONENT_WIDTH + (componentsInLayer - 1) * COMPONENT_GAP_X;
            const startX = (width - totalLayerContentWidth) / 2;

            return {
                ...comp,
                x: startX + indexInLayer * (COMPONENT_WIDTH + COMPONENT_GAP_X) + COMPONENT_WIDTH / 2,
                y: PADDING_TOP + (layerIndex * LAYER_HEIGHT) + LAYER_LABEL_HEIGHT + (LAYER_HEIGHT - LAYER_LABEL_HEIGHT) / 2,
                width: COMPONENT_WIDTH,
                height: COMPONENT_HEIGHT,
                layerIndex
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

    const handleLoadExample = (e) => {
        const testCaseId = e.target.value;
        if (!testCaseId) return;

        const testCase = architectureTestCases.find(tc => tc.id === testCaseId);
        if (testCase) {
            setDescription(testCase.description);
        }
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
            @keyframes flow {
              from { stroke-dashoffset: 20; }
              to { stroke-dashoffset: 0; }
            }
            .connector-path {
              transition: stroke 0.3s, stroke-width 0.3s;
            }
            .connector-path:hover {
              stroke-width: 3;
              filter: url(#glow);
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



                <div style={{ background: 'white', borderRadius: '20px', padding: isMobile ? '1.5rem' : '2.5rem', marginBottom: '2rem', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', animation: 'fadeInUp 0.6s ease-out 0.1s both' }}>

                    {/* AI Accuracy Disclaimer */}
                    <div style={{
                        background: '#eff6ff',
                        border: '1px solid #bfdbfe',
                        borderRadius: '12px',
                        padding: '1rem',
                        marginBottom: '1.5rem',
                        display: 'flex',
                        gap: '0.75rem',
                        alignItems: 'start'
                    }}>
                        <Info size={20} color="#1d4ed8" style={{ flexShrink: 0, marginTop: '2px' }} />
                        <div>
                            <p style={{ margin: 0, fontSize: '0.9rem', color: '#1e40af', fontWeight: 500 }}>
                                AI-generated diagrams may contain errors or inaccuracies.
                            </p>
                            <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#3b82f6' }}>
                                Please review and verify all outputs before use in production environments.
                            </p>
                        </div>
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

                        <select
                            value={provider}
                            onChange={(e) => setProvider(e.target.value)}
                            disabled={loading}
                            style={{
                                padding: '1rem 1.5rem',
                                fontSize: '1rem',
                                fontWeight: 600,
                                color: '#4b5563',
                                background: 'white',
                                border: '2px solid #e5e7eb',
                                borderRadius: '12px',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                transition: 'all 0.2s',
                                appearance: 'none',
                                textAlign: 'center',
                                minWidth: '180px'
                            }}
                        >
                            <option value="gemini">Google Gemini</option>
                            <option value="groq">Groq Llama</option>
                        </select>

                        <select
                            onChange={handleLoadExample}
                            disabled={loading}
                            className="load-example-select"
                            defaultValue=""
                            style={{
                                padding: '1rem 1.5rem',
                                fontSize: '1rem',
                                fontWeight: 600,
                                color: '#667eea',
                                background: 'white',
                                border: '2px solid #667eea',
                                borderRadius: '12px',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                transition: 'all 0.2s',
                                appearance: 'none',
                                textAlign: 'center',
                                minWidth: '240px'
                            }}
                        >
                            <option value="" disabled>Load Example System...</option>
                            {architectureTestCases.map(tc => (
                                <option key={tc.id} value={tc.id}>
                                    {tc.name}
                                </option>
                            ))}
                        </select>
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
                            justifyContent: 'flex-end',
                            alignItems: 'center',
                            marginBottom: '1rem',
                            paddingBottom: '1rem',
                            borderBottom: '2px solid #f3f4f6'
                        }}>
                            <div style={{
                                display: 'flex',
                                gap: '0.5rem'
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
                                <button onClick={() => openInDrawioWithLocalStorage(diagram)} style={{ padding: '0.5rem 1rem', background: '#f59e0b', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
                                    <Edit size={20} />
                                    Edit in Draw.io
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
                                <text
                                    x={diagram.width / 2}
                                    y={50}
                                    fontSize={isMobile ? "20" : "24"}
                                    fontWeight="bold"
                                    fill="#1f2937"
                                    textAnchor="middle"
                                    style={{ textTransform: 'uppercase', letterSpacing: '1px' }}
                                >
                                    {diagram.systemName}
                                </text>

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
    <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
        <path d="M 0 0 L 10 3.5 L 0 7 Z" fill="#94a3b8" />
    </marker>
    <marker id="arrowhead-active" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
        <path d="M 0 0 L 10 3.5 L 0 7 Z" fill="#667eea" />
    </marker>
    <marker id="arrowhead-start" markerWidth="10" markerHeight="7" refX="1" refY="3.5" orient="auto-start-reverse">
        <path d="M 10 0 L 0 3.5 L 10 7 Z" fill="#64748b" />
    </marker>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="2" dy="4" stdDeviation="4" floodOpacity="0.15" />
    </filter>
</defs>

{
    (() => {
        // ✅ Pre-calculate connection point distribution for all components
        const connectionPoints = new Map();

        diagram.components.forEach(comp => {
            connectionPoints.set(comp.id, {
                top: [],
                bottom: [],
                left: [],
                right: []
            });
        });

        diagram.connections.forEach((conn, idx) => {
            const fromComp = diagram.components.find(c => c.id === conn.from);
            const toComp = diagram.components.find(c => c.id === conn.to);
            if (!fromComp || !toComp) return;

            const dx = toComp.x - fromComp.x;
            const dy = toComp.y - fromComp.y;

            let fromEdge, toEdge;

            if (Math.abs(dy) > Math.abs(dx)) {
                if (dy > 0) {
                    fromEdge = 'bottom';
                    toEdge = 'top';
                } else {
                    fromEdge = 'top';
                    toEdge = 'bottom';
                }
            } else {
                if (dx > 0) {
                    fromEdge = 'right';
                    toEdge = 'left';
                } else {
                    fromEdge = 'left';
                    toEdge = 'right';
                }
            }

            const fromPoints = connectionPoints.get(fromComp.id);
            const toPoints = connectionPoints.get(toComp.id);

            if (fromPoints && fromPoints[fromEdge]) {
                fromPoints[fromEdge].push({ connIdx: idx, direction: 'out' });
            }
            if (toPoints && toPoints[toEdge]) {
                toPoints[toEdge].push({ connIdx: idx, direction: 'in' });
            }
        });

        // ✅ Calculate distributed points along edges
        const getDistributedPoint = (comp, edge, index, total) => {
            const EDGE_PADDING = 30;

            if (total <= 1) {
                switch (edge) {
                    case 'top':
                        return { x: comp.x, y: comp.y - comp.height / 2 };
                    case 'bottom':
                        return { x: comp.x, y: comp.y + comp.height / 2 };
                    case 'left':
                        return { x: comp.x - comp.width / 2, y: comp.y };
                    case 'right':
                        return { x: comp.x + comp.width / 2, y: comp.y };
                }
            }

            if (edge === 'top' || edge === 'bottom') {
                const availableWidth = comp.width - (2 * EDGE_PADDING);
                const spacing = total > 1 ? availableWidth / (total - 1) : 0;
                const startX = comp.x - comp.width / 2 + EDGE_PADDING;
                const x = startX + (index * spacing);
                const y = edge === 'top' ? comp.y - comp.height / 2 : comp.y + comp.height / 2;
                return { x, y };
            } else {
                const availableHeight = comp.height - (2 * EDGE_PADDING);
                const spacing = total > 1 ? availableHeight / (total - 1) : 0;
                const startY = comp.y - comp.height / 2 + EDGE_PADDING;
                const y = startY + (index * spacing);
                const x = edge === 'left' ? comp.x - comp.width / 2 : comp.x + comp.width / 2;
                return { x, y };
            }
        };

        // ✅ Track placed labels to avoid overlaps
        const placedLabels = [];

        // ✅ Helper: Check if label collides with anything
        const labelCollides = (x, y, width, height) => {
            const labelBox = {
                left: x - width / 2,
                right: x + width / 2,
                top: y - height / 2,
                bottom: y + height / 2
            };

            // Check collision with components (with extra buffer)
            for (const comp of diagram.components) {
                const compBox = {
                    left: comp.x - comp.width / 2 - 25, // Increased buffer
                    right: comp.x + comp.width / 2 + 25,
                    top: comp.y - comp.height / 2 - 25,
                    bottom: comp.y + comp.height / 2 + 25
                };

                if (!(labelBox.right < compBox.left ||
                    labelBox.left > compBox.right ||
                    labelBox.bottom < compBox.top ||
                    labelBox.top > compBox.bottom)) {
                    return true;
                }
            }

            // Check collision with other labels
            for (const placed of placedLabels) {
                if (!(labelBox.right < placed.left ||
                    labelBox.left > placed.right ||
                    labelBox.bottom < placed.top ||
                    labelBox.top > placed.bottom)) {
                    return true;
                }
            }

            return false;
        };

        // ✅ Helper: Find longest segment away from endpoints
        const findBestLabelPosition = (pathPoints) => {
            if (pathPoints.length < 3) return null;

            let longestSegment = { index: 0, length: 0 };

            // Prefer segments that are not the first or last
            for (let i = 1; i < pathPoints.length - 2; i++) {
                const p1 = pathPoints[i];
                const p2 = pathPoints[i + 1];
                const length = Math.sqrt(
                    Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2)
                );

                if (length > longestSegment.length) {
                    longestSegment = { index: i, length };
                }
            }

            return longestSegment;
        };

        // ✅ Helper: Try multiple label positions
        const findClearLabelPosition = (pathPoints, segmentIndex, labelWidth, labelHeight) => {
            const p1 = pathPoints[segmentIndex];
            const p2 = pathPoints[segmentIndex + 1];

            // Try positions at 25%, 50%, and 75% of the segment
            const candidatePoints = [
                { x: (p1.x * 0.75 + p2.x * 0.25), y: (p1.y * 0.75 + p2.y * 0.25) },
                { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 },
                { x: (p1.x * 0.25 + p2.x * 0.75), y: (p1.y * 0.25 + p2.y * 0.75) }
            ];

            const isVertical = Math.abs(p1.x - p2.x) < 5;
            const isHorizontal = Math.abs(p1.y - p2.y) < 5;

            const positions = [];

            for (const cp of candidatePoints) {
                if (isHorizontal) {
                    positions.push(
                        { x: cp.x, y: cp.y - 35 },  // Above
                        { x: cp.x, y: cp.y + 35 },  // Below
                        { x: cp.x, y: cp.y - 50 },  // Further above
                        { x: cp.x, y: cp.y + 50 }   // Further below
                    );
                } else if (isVertical) {
                    positions.push(
                        { x: cp.x + 50, y: cp.y },  // Right
                        { x: cp.x - 50, y: cp.y },  // Left
                        { x: cp.x + 70, y: cp.y },  // Further right
                        { x: cp.x - 70, y: cp.y }   // Further left
                    );
                } else {
                    const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
                    const perpAngle = angle + Math.PI / 2;

                    for (let dist of [40, 60, 80]) {
                        positions.push(
                            { x: cp.x + Math.cos(perpAngle) * dist, y: cp.y + Math.sin(perpAngle) * dist },
                            { x: cp.x - Math.cos(perpAngle) * dist, y: cp.y - Math.sin(perpAngle) * dist }
                        );
                    }
                }
            }

            // Find first position without collision
            for (const pos of positions) {
                if (!labelCollides(pos.x, pos.y, labelWidth, labelHeight)) {
                    return pos;
                }
            }

            // Fallback: return the first candidate midpoint above/right
            return positions[0];
        };

        // Render all connections
        return diagram.connections.map((conn, idx) => {
            const fromComp = diagram.components.find(c => c.id === conn.from);
            const toComp = diagram.components.find(c => c.id === conn.to);
            if (!fromComp || !toComp) return null;

            const dx = toComp.x - fromComp.x;
            const dy = toComp.y - fromComp.y;

            let fromEdge, toEdge;

            if (Math.abs(dy) > Math.abs(dx)) {
                if (dy > 0) {
                    fromEdge = 'bottom';
                    toEdge = 'top';
                } else {
                    fromEdge = 'top';
                    toEdge = 'bottom';
                }
            } else {
                if (dx > 0) {
                    fromEdge = 'right';
                    toEdge = 'left';
                } else {
                    fromEdge = 'left';
                    toEdge = 'right';
                }
            }

            const fromConnections = connectionPoints.get(fromComp.id)[fromEdge];
            const toConnections = connectionPoints.get(toComp.id)[toEdge];

            const fromIndex = fromConnections.findIndex(c => c.connIdx === idx);
            const toIndex = toConnections.findIndex(c => c.connIdx === idx);

            const start = getDistributedPoint(fromComp, fromEdge, fromIndex, fromConnections.length);
            const end = getDistributedPoint(toComp, toEdge, toIndex, toConnections.length);

            // Obstacle detection
            const getAllObstacles = () => {
                return diagram.components
                    .filter(c => c.id !== fromComp.id && c.id !== toComp.id)
                    .map(c => ({
                        left: c.x - c.width / 2 - 25,
                        right: c.x + c.width / 2 + 25,
                        top: c.y - c.height / 2 - 25,
                        bottom: c.y + c.height / 2 + 25
                    }));
            };

            const obstacles = getAllObstacles();

            const pathIntersectsObstacles = (points) => {
                for (let i = 0; i < points.length - 1; i++) {
                    const p1 = points[i];
                    const p2 = points[i + 1];

                    for (let t = 0; t <= 1; t += 0.1) {
                        const x = p1.x + (p2.x - p1.x) * t;
                        const y = p1.y + (p2.y - p1.y) * t;

                        for (const obs of obstacles) {
                            if (x >= obs.left && x <= obs.right &&
                                y >= obs.top && y <= obs.bottom) {
                                return true;
                            }
                        }
                    }
                }
                return false;
            };

            // Path routing with variation based on index
            let pathPoints = [];
            const routeVariation = (idx % 3) * 15;

            if (fromEdge === 'bottom' && toEdge === 'top') {
                const midY = (start.y + end.y) / 2 + routeVariation;
                let directPath = [start, { x: start.x, y: midY }, { x: end.x, y: midY }, end];

                if (!pathIntersectsObstacles(directPath)) {
                    pathPoints = directPath;
                } else {
                    const offset = ((idx % 3) - 1) * 90;
                    const detourX = (start.x + end.x) / 2 + offset;
                    pathPoints = [
                        start,
                        { x: start.x, y: start.y + 45 },
                        { x: detourX, y: start.y + 45 },
                        { x: detourX, y: end.y - 45 },
                        { x: end.x, y: end.y - 45 },
                        end
                    ];
                }
            } else if (fromEdge === 'top' && toEdge === 'bottom') {
                const midY = (start.y + end.y) / 2 - routeVariation;
                let directPath = [start, { x: start.x, y: midY }, { x: end.x, y: midY }, end];

                if (!pathIntersectsObstacles(directPath)) {
                    pathPoints = directPath;
                } else {
                    const offset = ((idx % 3) - 1) * 90;
                    const detourX = (start.x + end.x) / 2 + offset;
                    pathPoints = [
                        start,
                        { x: start.x, y: start.y - 45 },
                        { x: detourX, y: start.y - 45 },
                        { x: detourX, y: end.y + 45 },
                        { x: end.x, y: end.y + 45 },
                        end
                    ];
                }
            } else if (fromEdge === 'right' && toEdge === 'left') {
                const midX = (start.x + end.x) / 2 + routeVariation;
                let directPath = [start, { x: midX, y: start.y }, { x: midX, y: end.y }, end];

                if (!pathIntersectsObstacles(directPath)) {
                    pathPoints = directPath;
                } else {
                    const offset = ((idx % 3) - 1) * 70;
                    const detourY = (start.y + end.y) / 2 + offset;
                    pathPoints = [
                        start,
                        { x: start.x + 45, y: start.y },
                        { x: start.x + 45, y: detourY },
                        { x: end.x - 45, y: detourY },
                        { x: end.x - 45, y: end.y },
                        end
                    ];
                }
            } else if (fromEdge === 'left' && toEdge === 'right') {
                const midX = (start.x + end.x) / 2 - routeVariation;
                let directPath = [start, { x: midX, y: start.y }, { x: midX, y: end.y }, end];

                if (!pathIntersectsObstacles(directPath)) {
                    pathPoints = directPath;
                } else {
                    const offset = ((idx % 3) - 1) * 70;
                    const detourY = (start.y + end.y) / 2 + offset;
                    pathPoints = [
                        start,
                        { x: start.x - 45, y: start.y },
                        { x: start.x - 45, y: detourY },
                        { x: end.x + 45, y: detourY },
                        { x: end.x + 45, y: end.y },
                        end
                    ];
                }
            } else {
                const midX = (start.x + end.x) / 2;
                const midY = (start.y + end.y) / 2;

                if (fromEdge === 'bottom' || fromEdge === 'top') {
                    pathPoints = [start, { x: start.x, y: midY }, { x: end.x, y: midY }, end];
                } else {
                    pathPoints = [start, { x: midX, y: start.y }, { x: midX, y: end.y }, end];
                }
            }

            // Generate SVG path
            let pathData = `M ${pathPoints[0].x} ${pathPoints[0].y}`;
            for (let i = 1; i < pathPoints.length; i++) {
                pathData += ` L ${pathPoints[i].x} ${pathPoints[i].y}`;
            }

            // ✅ Dynamic label width estimation
            const labelWidth = (conn.label ? conn.label.length * 8 : 0) + 24;
            const labelHeight = 28;

            // ✅ Smart label positioning
            const bestSegment = findBestLabelPosition(pathPoints);
            const labelPos = bestSegment
                ? findClearLabelPosition(pathPoints, bestSegment.index, labelWidth, labelHeight)
                : { x: (pathPoints[0].x + pathPoints[pathPoints.length - 1].x) / 2, y: (pathPoints[0].y + pathPoints[pathPoints.length - 1].y) / 2 - 40 };

            // Register this label's position
            placedLabels.push({
                left: labelPos.x - labelWidth / 2,
                right: labelPos.x + labelWidth / 2,
                top: labelPos.y - labelHeight / 2,
                bottom: labelPos.y + labelHeight / 2
            });

            const isAsync = conn.type === 'async';
            const strokeColor = isAsync ? '#94a3b8' : '#64748b';
            const isBidirectional = conn.type === 'bidirectional';

            return (
                <g key={idx}>
                    <path
                        d={pathData}
                        stroke="rgba(102, 126, 234, 0.05)"
                        strokeWidth="14"
                        fill="none"
                        style={{ pointerEvents: 'none' }}
                    />

                    <path
                        className="connector-path"
                        d={pathData}
                        stroke={strokeColor}
                        strokeWidth="2.5"
                        fill="none"
                        markerEnd={`url(#${isAsync ? 'arrowhead' : 'arrowhead-active'})`}
                        markerStart={isBidirectional ? `url(#arrowhead-start)` : 'none'}
                        strokeDasharray={isAsync ? '6,4' : 'none'}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{
                            opacity: 0.85,
                            transition: 'stroke-width 0.2s, opacity 0.2s'
                        }}
                    />

                    {/* ✅ Robust Collision-free label */}
                    <g transform={`translate(${labelPos.x}, ${labelPos.y})`}>
                        <rect
                            x={-labelWidth / 2}
                            y={-labelHeight / 2}
                            width={labelWidth}
                            height={labelHeight}
                            fill="white"
                            rx="8"
                            stroke={isAsync ? '#e2e8f0' : '#dbeafe'}
                            strokeWidth="1.5"
                            style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.1))' }}
                        />
                        <text
                            fontSize="10"
                            fontWeight="700"
                            fill={isAsync ? '#64748b' : '#3b82f6'}
                            textAnchor="middle"
                            dominantBaseline="central"
                            style={{ pointerEvents: 'none' }}
                        >
                            {conn.label}
                        </text>
                    </g>
                </g>
            );
        });
    })()
}
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
                <div style={{ marginTop: '3rem', textAlign: 'center', color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', paddingBottom: '2rem' }}>

                    <a
                        href="https://www.linkedin.com/in/csivaraman/"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            color: 'white',
                            textDecoration: 'none',
                            fontWeight: 500,
                            padding: '0.5rem 1.25rem',
                            background: 'rgba(255,255,255,0.1)',
                            borderRadius: '9999px',
                            border: '1px solid rgba(255,255,255,0.2)',
                            transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
                            e.currentTarget.style.transform = 'translateY(-1px)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                            e.currentTarget.style.transform = 'translateY(0)';
                        }}
                    >
                        <span>Built by Chandrasekar Sivaraman</span>
                        <Linkedin size={16} style={{ marginTop: '-1px' }} />
                    </a>
                </div>
            </div>

            {/* API Quota Toast */}
            {quotaError && (
                <div style={{
                    position: 'fixed',
                    bottom: '24px',
                    right: '24px',
                    maxWidth: '400px',
                    background: 'white',
                    padding: '1.25rem',
                    borderRadius: '12px',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
                    borderLeft: '6px solid #ef4444',
                    display: 'flex',
                    gap: '1rem',
                    alignItems: 'start',
                    zIndex: 1000,
                    animation: 'fadeInUp 0.3s ease-out'
                }}>
                    <AlertTriangle size={24} color="#ef4444" style={{ flexShrink: 0 }} />
                    <div>
                        <h4 style={{ margin: '0 0 0.25rem', color: '#1f2937', fontSize: '1rem', fontWeight: 700 }}>API Quota Exceeded</h4>
                        <p style={{ margin: 0, color: '#4b5563', fontSize: '0.9rem', lineHeight: '1.4' }}>
                            This service uses free-tier Gemini API with daily limits. Service may be temporarily unavailable. Please try again later.
                        </p>
                        <button
                            onClick={() => setQuotaError(false)}
                            style={{
                                display: 'block',
                                marginTop: '0.75rem',
                                border: 'none',
                                background: 'transparent',
                                color: '#ef4444',
                                fontSize: '0.85rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                padding: 0
                            }}
                        >
                            Dismiss
                        </button>
                    </div>
                </div>
            )}

            {/* <RateLimitStatus stats={stats} /> */}
        </div >
    );
};

export default ArchitectureDiagramGenerator;