import React, { useState, useRef } from 'react';
import { Loader2, Sparkles, Network, Download, ZoomIn, ZoomOut, AlertCircle, Info, AlertTriangle, Linkedin, Edit } from 'lucide-react';
import { openInDrawioWithLocalStorage } from './utils/drawioIntegration';
import { getCloudIcon, getCloudBadge, normalizeServiceName } from './utils/cloudIcons';
import TestRunner from './test/TestRunner.jsx';
import { architectureTestCases } from './data/architectureTestCases';



const ArchitectureDiagramGenerator = () => {
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);
    const [diagram, setDiagram] = useState(null);
    const [zoom, setZoom] = useState(1);


    const [provider, setProvider] = useState('gemini');
    const [cloudProvider, setCloudProvider] = useState('none');
    const [error, setError] = useState(null);
    const [quotaError, setQuotaError] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [isTablet, setIsTablet] = useState(window.innerWidth >= 768 && window.innerWidth < 1024);
    const [activeConnection, setActiveConnection] = useState(null);
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
                body: JSON.stringify({ systemDescription: descToUse, provider, cloudProvider }),
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
        const COMPONENT_WIDTH = isMobile ? 150 : (isTablet ? 180 : 220);
        const COMPONENT_HEIGHT = isMobile ? 90 : 120;
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

            // ✅ Extract cloud metadata if available
            // Normalize service name for better matching
            const normalizedService = comp.cloudService ? normalizeServiceName(comp.cloudService) : '';
            const cloudIconUrl = comp.cloudProvider ? getCloudIcon(comp.cloudProvider, normalizedService) : null;
            const cloudBadge = comp.cloudProvider ? getCloudBadge(comp.cloudProvider) : null;

            return {
                ...comp,
                x: startX + indexInLayer * (COMPONENT_WIDTH + COMPONENT_GAP_X) + COMPONENT_WIDTH / 2,
                y: PADDING_TOP + (layerIndex * LAYER_HEIGHT) + LAYER_LABEL_HEIGHT + (LAYER_HEIGHT - LAYER_LABEL_HEIGHT) / 2,
                width: COMPONENT_WIDTH,
                height: COMPONENT_HEIGHT,
                layerIndex,
                cloudIconUrl,
                cloudBadge,
                normalizedService // Pass this if needed, or just rely on cloudService
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
                            System Description & Cloud Preference
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
                                    Generating with {provider === 'gemini' ? 'Gemini' : 'Groq Llama'}...
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
                            value={cloudProvider}
                            onChange={(e) => setCloudProvider(e.target.value)}
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
                                minWidth: '200px'
                            }}
                        >
                            <option value="none">No Cloud Icons</option>
                            <option value="aws">AWS Only</option>
                            <option value="azure">Azure Only</option>
                            <option value="gcp">GCP Only</option>
                            <option value="hybrid">Multi-Cloud</option>
                        </select>

                        <select
                            onChange={handleLoadExample}
                            disabled={loading}
                            className="load-example-select"
                            data-testid="load-example-select"
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
                                    {[0, 1, 2, 3, 4, 5, 6, 7].map(i => {
                                        const colors = ['#64748b', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];
                                        return (
                                            <marker
                                                key={`arrow-${i}`}
                                                id={`arrowhead-${i}`}
                                                markerWidth="10"
                                                markerHeight="10"
                                                refX="9"
                                                refY="5"
                                                orient="auto"
                                            >
                                                <path d="M 0 0 L 10 5 L 0 10 z" fill={colors[i]} />
                                            </marker>
                                        );
                                    })}

                                    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                                        <feDropShadow dx="2" dy="4" stdDeviation="4" floodOpacity="0.15" />
                                    </filter>
                                </defs>

                                {
                                    (() => {
                                        // ✅ Pre-calculate connection point distribution
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

                                            connectionPoints.get(fromComp.id)[fromEdge].push({ connIdx: idx, direction: 'out', toCompId: toComp.id });
                                            connectionPoints.get(toComp.id)[toEdge].push({ connIdx: idx, direction: 'in', fromCompId: fromComp.id });
                                        });

                                        // ✅ IMPROVEMENT 3: Redistribute if edge is too crowded (>3 connections)
                                        const redistributeOvercrowdedEdges = () => {
                                            diagram.components.forEach(comp => {
                                                const points = connectionPoints.get(comp.id);

                                                // Check each edge
                                                ['top', 'bottom', 'left', 'right'].forEach(edge => {
                                                    if (points[edge].length > 3) {
                                                        // Move some connections to adjacent edges
                                                        const overflow = points[edge].splice(3);

                                                        // Determine adjacent edges
                                                        const adjacentEdges = edge === 'top' || edge === 'bottom'
                                                            ? ['left', 'right']
                                                            : ['top', 'bottom'];

                                                        // Distribute overflow to adjacent edges
                                                        overflow.forEach((conn, i) => {
                                                            const targetEdge = adjacentEdges[i % 2];
                                                            points[targetEdge].push(conn);
                                                        });
                                                    }
                                                });
                                            });
                                        };

                                        redistributeOvercrowdedEdges();

                                        // ✅ IMPROVEMENT 3: Color palette for connector differentiation
                                        const getConnectorColor = (idx, fromComp, toComp) => {
                                            // Generate color based on connection index for visual distinction
                                            const colors = [
                                                '#64748b', // Default gray
                                                '#3b82f6', // Blue
                                                '#10b981', // Green
                                                '#f59e0b', // Orange
                                                '#8b5cf6', // Purple
                                                '#ec4899', // Pink
                                                '#14b8a6', // Teal
                                                '#f97316', // Orange-red
                                            ];

                                            // Use modulo to cycle through colors
                                            return colors[idx % colors.length];
                                        };

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

                                        const placedLabels = [];

                                        // ✅ IMPROVEMENT 1: Enhanced collision detection with arrow avoidance
                                        const labelCollides = (x, y, pathPoints, width = 90, height = 26) => {
                                            const COMPONENT_BUFFER = 25; // Increased buffer
                                            const ARROW_BUFFER = 40; // Minimum distance from path endpoints

                                            const labelBox = {
                                                left: x - width / 2,
                                                right: x + width / 2,
                                                top: y - height / 2,
                                                bottom: y + height / 2
                                            };

                                            // ✅ Check if label is too close to arrow endpoints
                                            if (pathPoints && pathPoints.length > 0) {
                                                const startPoint = pathPoints[0];
                                                const endPoint = pathPoints[pathPoints.length - 1];

                                                const distToStart = Math.sqrt(Math.pow(x - startPoint.x, 2) + Math.pow(y - startPoint.y, 2));
                                                const distToEnd = Math.sqrt(Math.pow(x - endPoint.x, 2) + Math.pow(y - endPoint.y, 2));

                                                if (distToStart < ARROW_BUFFER || distToEnd < ARROW_BUFFER) {
                                                    return true; // Too close to arrows
                                                }
                                            }

                                            // Check collision with components
                                            for (const comp of diagram.components) {
                                                const compBox = {
                                                    left: comp.x - comp.width / 2 - COMPONENT_BUFFER,
                                                    right: comp.x + comp.width / 2 + COMPONENT_BUFFER,
                                                    top: comp.y - comp.height / 2 - COMPONENT_BUFFER,
                                                    bottom: comp.y + comp.height / 2 + COMPONENT_BUFFER
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
                                                const LABEL_BUFFER = 8;
                                                if (!(labelBox.right + LABEL_BUFFER < placed.left ||
                                                    labelBox.left - LABEL_BUFFER > placed.right ||
                                                    labelBox.bottom + LABEL_BUFFER < placed.top ||
                                                    labelBox.top - LABEL_BUFFER > placed.bottom)) {
                                                    return true;
                                                }
                                            }

                                            return false;
                                        };

                                        const findBestLabelPosition = (pathPoints) => {
                                            if (pathPoints.length < 4) return { index: 1, length: 0 };

                                            let longestSegment = { index: 1, length: 0 };

                                            // Skip first and last segments (near arrows)
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

                                        const findClearLabelPosition = (pathPoints, segmentIndex) => {
                                            const p1 = pathPoints[segmentIndex];
                                            const p2 = pathPoints[segmentIndex + 1];

                                            const midX = (p1.x + p2.x) / 2;
                                            const midY = (p1.y + p2.y) / 2;

                                            const isVertical = Math.abs(p1.x - p2.x) < 5;
                                            const isHorizontal = Math.abs(p1.y - p2.y) < 5;

                                            const positions = [];

                                            if (isHorizontal) {
                                                positions.push(
                                                    { x: midX, y: midY - 35 },
                                                    { x: midX, y: midY + 35 },
                                                    { x: midX, y: midY - 50 },
                                                    { x: midX, y: midY + 50 },
                                                    { x: midX - 70, y: midY - 35 },
                                                    { x: midX + 70, y: midY - 35 },
                                                    { x: midX - 70, y: midY + 35 },
                                                    { x: midX + 70, y: midY + 35 }
                                                );
                                            } else if (isVertical) {
                                                positions.push(
                                                    { x: midX + 55, y: midY },
                                                    { x: midX - 55, y: midY },
                                                    { x: midX + 75, y: midY },
                                                    { x: midX - 75, y: midY },
                                                    { x: midX + 55, y: midY - 30 },
                                                    { x: midX - 55, y: midY - 30 },
                                                    { x: midX + 55, y: midY + 30 },
                                                    { x: midX - 55, y: midY + 30 }
                                                );
                                            } else {
                                                const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
                                                const perpAngle = angle + Math.PI / 2;

                                                for (let dist of [40, 60, 80, 100]) {
                                                    positions.push(
                                                        {
                                                            x: midX + Math.cos(perpAngle) * dist,
                                                            y: midY + Math.sin(perpAngle) * dist
                                                        },
                                                        {
                                                            x: midX - Math.cos(perpAngle) * dist,
                                                            y: midY - Math.sin(perpAngle) * dist
                                                        }
                                                    );
                                                }
                                            }

                                            for (const pos of positions) {
                                                if (!labelCollides(pos.x, pos.y, pathPoints)) {
                                                    return pos;
                                                }
                                            }

                                            // Extended fallback
                                            for (let offset = 70; offset <= 140; offset += 20) {
                                                const fallbackPositions = isVertical
                                                    ? [{ x: midX + offset, y: midY }, { x: midX - offset, y: midY }]
                                                    : [{ x: midX, y: midY - offset }, { x: midX, y: midY + offset }];

                                                for (const pos of fallbackPositions) {
                                                    if (!labelCollides(pos.x, pos.y, pathPoints)) {
                                                        return pos;
                                                    }
                                                }
                                            }

                                            return positions[0];
                                        };

                                        // ✅ IMPROVEMENT 4: Check if path segment passes through component
                                        const segmentPassesThroughComponent = (x1, y1, x2, y2, comp) => {
                                            const PROXIMITY_THRESHOLD = 30; // If path is within 30px of component center

                                            const compBox = {
                                                left: comp.x - comp.width / 2,
                                                right: comp.x + comp.width / 2,
                                                top: comp.y - comp.height / 2,
                                                bottom: comp.y + comp.height / 2
                                            };

                                            // Check multiple points along segment
                                            for (let t = 0.2; t <= 0.8; t += 0.2) {
                                                const x = x1 + (x2 - x1) * t;
                                                const y = y1 + (y2 - y1) * t;

                                                if (x >= compBox.left - PROXIMITY_THRESHOLD &&
                                                    x <= compBox.right + PROXIMITY_THRESHOLD &&
                                                    y >= compBox.top - PROXIMITY_THRESHOLD &&
                                                    y <= compBox.bottom + PROXIMITY_THRESHOLD) {
                                                    return true;
                                                }
                                            }

                                            return false;
                                        };

                                        // Render connections
                                        return diagram.connections.map((conn, idx) => {
                                            const fromComp = diagram.components.find(c => c.id === conn.from);
                                            const toComp = diagram.components.find(c => c.id === conn.to);
                                            if (!fromComp || !toComp) return null;

                                            const dx = toComp.x - fromComp.x;
                                            const dy = toComp.y - fromComp.y;

                                            let fromEdge, toEdge;

                                            if (Math.abs(dy) > Math.abs(dx)) {
                                                fromEdge = dy > 0 ? 'bottom' : 'top';
                                                toEdge = dy > 0 ? 'top' : 'bottom';
                                            } else {
                                                fromEdge = dx > 0 ? 'right' : 'left';
                                                toEdge = dx > 0 ? 'left' : 'right';
                                            }

                                            const fromConnections = connectionPoints.get(fromComp.id)[fromEdge];
                                            const toConnections = connectionPoints.get(toComp.id)[toEdge];

                                            const fromIndex = fromConnections.findIndex(c => c.connIdx === idx);
                                            const toIndex = toConnections.findIndex(c => c.connIdx === idx);

                                            const start = getDistributedPoint(fromComp, fromEdge, fromIndex, fromConnections.length);
                                            const end = getDistributedPoint(toComp, toEdge, toIndex, toConnections.length);

                                            const getAllObstacles = () => {
                                                return diagram.components
                                                    .filter(c => c.id !== fromComp.id && c.id !== toComp.id)
                                                    .map(c => ({
                                                        ...c,
                                                        left: c.x - c.width / 2 - 25,
                                                        right: c.x + c.width / 2 + 25,
                                                        top: c.y - c.height / 2 - 25,
                                                        bottom: c.y + c.height / 2 + 25
                                                    }));
                                            };

                                            const obstacles = getAllObstacles();

                                            const pathIntersectsObstacles = (points) => {
                                                for (let i = 0; i < points.length - 1; i++) {
                                                    for (let t = 0; t <= 1; t += 0.1) {
                                                        const x = points[i].x + (points[i + 1].x - points[i].x) * t;
                                                        const y = points[i].y + (points[i + 1].y - points[i].y) * t;

                                                        for (const obs of obstacles) {
                                                            if (x >= obs.left && x <= obs.right && y >= obs.top && y <= obs.bottom) {
                                                                return true;
                                                            }
                                                        }
                                                    }
                                                }
                                                return false;
                                            };

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
                                                        { x: start.x, y: start.y + 40 },
                                                        { x: detourX, y: start.y + 40 },
                                                        { x: detourX, y: end.y - 40 },
                                                        { x: end.x, y: end.y - 40 },
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
                                                        { x: start.x, y: start.y - 40 },
                                                        { x: detourX, y: start.y - 40 },
                                                        { x: detourX, y: end.y + 40 },
                                                        { x: end.x, y: end.y + 40 },
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
                                                        { x: start.x + 40, y: start.y },
                                                        { x: start.x + 40, y: detourY },
                                                        { x: end.x - 40, y: detourY },
                                                        { x: end.x - 40, y: end.y },
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
                                                        { x: start.x - 40, y: start.y },
                                                        { x: start.x - 40, y: detourY },
                                                        { x: end.x + 40, y: detourY },
                                                        { x: end.x + 40, y: end.y },
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

                                            // ✅ IMPROVEMENT 4: Build path with conditional dashing
                                            let pathSegments = [];
                                            for (let i = 0; i < pathPoints.length - 1; i++) {
                                                const p1 = pathPoints[i];
                                                const p2 = pathPoints[i + 1];

                                                // Check if this segment passes through any component
                                                const passesThroughComponent = obstacles.some(obs =>
                                                    segmentPassesThroughComponent(p1.x, p1.y, p2.x, p2.y, obs)
                                                );

                                                pathSegments.push({
                                                    x1: p1.x,
                                                    y1: p1.y,
                                                    x2: p2.x,
                                                    y2: p2.y,
                                                    dashed: passesThroughComponent
                                                });
                                            }

                                            const bestSegment = findBestLabelPosition(pathPoints);
                                            const labelPos = findClearLabelPosition(pathPoints, bestSegment.index);

                                            // Register label position (only for non-fallback cases if possible, but here we just push)
                                            placedLabels.push({
                                                left: labelPos.x - 45,
                                                right: labelPos.x + 45,
                                                top: labelPos.y - 13,
                                                bottom: labelPos.y + 13
                                            });

                                            const isAsync = conn.type === 'async';
                                            const connectorColor = getConnectorColor(idx, fromComp, toComp);

                                            const isActive = activeConnection === idx;

                                            // Make style dynamic based on hover
                                            const strokeWidth = isActive ? 4 : 2.5;
                                            const opacity = isActive ? 1 : 0.85;
                                            const glowWidth = isActive ? 20 : 14;
                                            const glowOpacity = isActive ? 0.2 : 0.05;

                                            return (
                                                <g
                                                    key={idx}
                                                    onMouseEnter={() => setActiveConnection(idx)}
                                                    onMouseLeave={() => setActiveConnection(null)}
                                                    style={{ cursor: 'pointer', transition: 'all 0.3s ease' }}
                                                >
                                                    {/* Render each segment separately with conditional dashing */}
                                                    {pathSegments.map((seg, segIdx) => (
                                                        <g key={`seg-${segIdx}`}>
                                                            {/* Glow */}
                                                            <line
                                                                x1={seg.x1}
                                                                y1={seg.y1}
                                                                x2={seg.x2}
                                                                y2={seg.y2}
                                                                stroke={connectorColor}
                                                                strokeWidth={glowWidth}
                                                                strokeOpacity={glowOpacity}
                                                                strokeLinecap="round"
                                                                style={{ transition: 'all 0.3s ease' }}
                                                            />

                                                            {/* Main line */}
                                                            <line
                                                                x1={seg.x1}
                                                                y1={seg.y1}
                                                                x2={seg.x2}
                                                                y2={seg.y2}
                                                                stroke={connectorColor}
                                                                strokeWidth={strokeWidth}
                                                                strokeDasharray={seg.dashed ? '8,4' : (isAsync ? '6,4' : 'none')}
                                                                strokeLinecap="round"
                                                                markerEnd={segIdx === pathSegments.length - 1 ? `url(#arrowhead-${idx % 8})` : 'none'}
                                                                style={{
                                                                    opacity,
                                                                    transition: 'all 0.3s ease',
                                                                    filter: isActive ? 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' : 'none'
                                                                }}
                                                            />
                                                        </g>
                                                    ))}

                                                    {/* Label */}
                                                    <g
                                                        transform={`translate(${labelPos.x}, ${labelPos.y})`}
                                                        style={{
                                                            transition: 'all 0.3s ease',
                                                            transformOrigin: 'center'
                                                        }}
                                                    >
                                                        <rect
                                                            x="-45"
                                                            y="-13"
                                                            width="90"
                                                            height="26"
                                                            fill="white"
                                                            rx="6"
                                                            stroke={connectorColor}
                                                            strokeWidth={isActive ? 2 : 1.5}
                                                            style={{
                                                                filter: isActive ? 'drop-shadow(0 4px 12px rgba(0,0,0,0.15))' : 'drop-shadow(0 2px 8px rgba(0,0,0,0.12))',
                                                                transition: 'all 0.3s ease'
                                                            }}
                                                        />
                                                        <text
                                                            fontSize={isActive ? "11" : "10"}
                                                            fontWeight="700"
                                                            fill={connectorColor}
                                                            textAnchor="middle"
                                                            dominantBaseline="central"
                                                            style={{ transition: 'all 0.3s ease' }}
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

                                    // Normalize service name for better matching
                                    const normalizedService = normalizeServiceName(comp.cloudService);
                                    const cloudIconUrl = comp.cloudProvider
                                        ? getCloudIcon(comp.cloudProvider, normalizedService)
                                        : null;

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

                                            {/* ✅ Cloud Provider Icon Badge */}
                                            {cloudIconUrl && (
                                                <image
                                                    href={cloudIconUrl}
                                                    x={comp.width - 30}
                                                    y="6"
                                                    width="24"
                                                    height="24"
                                                    style={{
                                                        opacity: 0.95,
                                                        filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.25))'
                                                    }}
                                                />
                                            )}

                                            {/* ✅ Fallback: Colored Badge if icon fails */}
                                            {comp.cloudProvider && !cloudIconUrl && (
                                                <g transform={`translate(${comp.width - 30}, 12)`}>
                                                    <circle
                                                        r="12"
                                                        fill={getCloudBadge(comp.cloudProvider)?.color || '#666'}
                                                        stroke="white"
                                                        strokeWidth="2"
                                                        filter="drop-shadow(0 1px 3px rgba(0,0,0,0.2))"
                                                    />
                                                    <text
                                                        fontSize="8"
                                                        fontWeight="700"
                                                        fill="white"
                                                        textAnchor="middle"
                                                        dominantBaseline="central"
                                                    >
                                                        {getCloudBadge(comp.cloudProvider)?.text || '☁'}
                                                    </text>
                                                </g>
                                            )}

                                            <foreignObject width={comp.width} height={comp.height}>
                                                <div xmlns="http://www.w3.org/1999/xhtml" style={{
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    height: '100%',
                                                    color: 'white',
                                                    textAlign: 'center',
                                                    padding: '8px',
                                                    paddingRight: cloudIconUrl ? '32px' : '8px' // Make room for icon
                                                }}>
                                                    <div style={{
                                                        fontWeight: 'bold',
                                                        fontSize: '14px',
                                                        marginBottom: '2px',
                                                        lineHeight: '1.2'
                                                    }}>
                                                        {comp.name}
                                                    </div>

                                                    <div style={{
                                                        fontSize: '10px',
                                                        opacity: 0.9,
                                                        textTransform: 'uppercase',
                                                        letterSpacing: '0.5px'
                                                    }}>
                                                        {comp.type}
                                                    </div>

                                                    {/* ✅ Show cloud service name */}
                                                    {comp.cloudService && (
                                                        <div style={{
                                                            fontSize: '8px',
                                                            marginTop: '4px',
                                                            opacity: 0.85,
                                                            background: 'rgba(255,255,255,0.2)',
                                                            padding: '2px 6px',
                                                            borderRadius: '4px',
                                                            maxWidth: '90%',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            whiteSpace: 'nowrap'
                                                        }}>
                                                            {comp.cloudService}
                                                        </div>
                                                    )}

                                                    {comp.technologies && comp.technologies.length > 0 && (
                                                        <div style={{
                                                            fontSize: '9px',
                                                            marginTop: '4px',
                                                            opacity: 0.8,
                                                            display: 'flex',
                                                            gap: '4px',
                                                            flexWrap: 'wrap',
                                                            justifyContent: 'center',
                                                            maxWidth: '100%'
                                                        }}>
                                                            {comp.technologies.slice(0, 2).map(t => (
                                                                <span key={t} style={{
                                                                    background: 'rgba(0,0,0,0.2)',
                                                                    padding: '1px 4px',
                                                                    borderRadius: '4px'
                                                                }}>
                                                                    {t}
                                                                </span>
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
                        {/* ✅ IMPROVEMENT 2: Component Types Legend */}
                        <div style={{
                            marginTop: '1.5rem',
                            padding: '1.25rem',
                            background: '#f9fafb',
                            borderRadius: '12px',
                            border: '2px solid #e5e7eb'
                        }}>
                            <h4 style={{
                                fontSize: '0.875rem',
                                fontWeight: 700,
                                color: '#1f2937',
                                marginBottom: '0.75rem',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px'
                            }}>
                                Component Types
                            </h4>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                                gap: '0.75rem'
                            }}>
                                {['frontend', 'backend', 'database', 'cache', 'queue', 'api', 'service', 'external'].map(type => {
                                    const colors = getComponentColor(type);
                                    return (
                                        <div key={type} style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.5rem',
                                            padding: '0.5rem',
                                            background: 'white',
                                            borderRadius: '6px',
                                            border: '1px solid #e5e7eb'
                                        }}>
                                            <div style={{
                                                width: '24px',
                                                height: '24px',
                                                background: colors.bg,
                                                border: `2px solid ${colors.border}`,
                                                borderRadius: '4px',
                                                flexShrink: 0
                                            }} />
                                            <span style={{
                                                fontSize: '0.8rem',
                                                color: '#4b5563',
                                                fontWeight: 500,
                                                textTransform: 'capitalize'
                                            }}>
                                                {type}
                                            </span>
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