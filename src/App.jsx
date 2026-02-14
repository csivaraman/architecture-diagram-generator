import React, { useState, useRef } from 'react';
import { Loader2, Sparkles, Network, Download, ZoomIn, ZoomOut, AlertCircle, Info, AlertTriangle, Linkedin, Edit } from 'lucide-react';
import { openInDrawioWithLocalStorage } from './utils/drawioIntegration';
import { getCloudIcon, getCloudBadge, normalizeServiceName } from './utils/cloudIcons';
import {
    getComponentColor,
    redistributeOvercrowdedEdges,
    layoutDiagram,
    calculateConnectorPath,
    getConnectorColor,
    getDistributedPoint,
    labelCollides,
    findBestLabelPosition,
    findClearLabelPosition,
    segmentPassesThroughComponent,
    pathIntersectsObstacles,
    measureLabelText
} from './utils/diagramLayout';
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
            const visualDiagram = layoutDiagram(architecture, generatedSystemName, { isMobile, isTablet });
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

                                        redistributeOvercrowdedEdges(diagram.components, connectionPoints);

                                        const placedLabels = [];

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

                                            const routeVariation = (idx % 3) * 15;
                                            const detourOffset = ((idx % 3) - 1) * 90;

                                            const { pathPoints, pathSegments } = calculateConnectorPath(
                                                start,
                                                end,
                                                fromEdge,
                                                toEdge,
                                                routeVariation,
                                                detourOffset,
                                                obstacles
                                            );

                                            const bestSegment = findBestLabelPosition(pathPoints);
                                            const labelDims = measureLabelText(conn.label);
                                            const labelPos = findClearLabelPosition(pathPoints, bestSegment.index, diagram.components, placedLabels, labelDims.width, labelDims.height);

                                            // Register label position with actual dimensions
                                            const hw = labelDims.width / 2;
                                            const hh = labelDims.height / 2;
                                            placedLabels.push({
                                                left: labelPos.x - hw,
                                                right: labelPos.x + hw,
                                                top: labelPos.y - hh,
                                                bottom: labelPos.y + hh
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

                                                    {/* Label — auto-sized to fit text */}
                                                    <g
                                                        transform={`translate(${labelPos.x}, ${labelPos.y})`}
                                                        style={{
                                                            transition: 'all 0.3s ease',
                                                            transformOrigin: 'center'
                                                        }}
                                                    >
                                                        <rect
                                                            x={-hw}
                                                            y={-hh}
                                                            width={labelDims.width}
                                                            height={labelDims.height}
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