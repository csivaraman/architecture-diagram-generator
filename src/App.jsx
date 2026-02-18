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
    measureLabelText,
    clipSegmentsAroundLabels,
    layoutCloudDiagram
} from './utils/diagramLayout';
import CloudDiagramRenderer from './components/CloudDiagramRenderer';
import LegacyDiagramRenderer from './components/LegacyDiagramRenderer';
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
                    `%c[Service Request] Received fresh diagram from ${diagProvider ? diagProvider.toUpperCase() : provider.toUpperCase()} (Key #${keyId || '?'}, Model: 'unknown'})`,
                    'color: #3b82f6; font-weight: bold;'
                );
            }

            if (!architecture.components || !architecture.connections || !architecture.layers) {
                throw new Error('Invalid architecture structure returned');
            }

            // Use generated system name or fallback
            const generatedSystemName = architecture.systemName || 'System Architecture';

            let visualDiagram;
            // Determine if we should use Cloud Standard Layout
            // Criteria: cloudProvider is 'auto' (user selected "Cloud" option) OR
            //           cloudProvider is specific ('aws', 'azure', 'gcp', 'multi') AND architecture has a cloudProvider
            const isCloudMode = cloudProvider === 'auto' || (cloudProvider !== 'none' && architecture.cloudProvider);

            if (isCloudMode) {
                // CLOUD STANDARDS MODE (Native SVG)
                visualDiagram = layoutCloudDiagram(architecture, generatedSystemName, { isMobile, isTablet });
            } else {
                // LEGACY SVG MODE (Default)
                visualDiagram = layoutDiagram(architecture, generatedSystemName, { isMobile, isTablet });
            }

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
                            <option value="none">Default</option>
                            <option value="auto">Cloud</option>
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
                                {!diagram.isCloudMode && (
                                    <button onClick={() => openInDrawioWithLocalStorage(diagram)} style={{ padding: '0.5rem 1rem', background: '#f59e0b', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
                                        <Edit size={20} />
                                        Edit in Draw.io
                                    </button>
                                )}
                            </div>
                        </div>
                        <div style={{ overflow: 'auto', background: diagram.isCloudMode ? '#fff' : '#f9fafb', borderRadius: '12px', padding: '2rem', minHeight: '600px' }}>
                            {diagram.isCloudMode ? (
                                <div style={{ transform: `scale(${zoom})`, transformOrigin: 'top left', transition: 'transform 0.2s' }}>
                                    <CloudDiagramRenderer
                                        diagram={diagram}
                                        activeConnection={activeConnection}
                                        setActiveConnection={setActiveConnection}
                                    />
                                </div>
                            ) : (
                                <LegacyDiagramRenderer
                                    diagram={diagram}
                                    zoom={zoom}
                                    activeConnection={activeConnection}
                                    setActiveConnection={setActiveConnection}
                                />
                            )}
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
                )
                }

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
            </div >

            {/* API Quota Toast */}
            {
                quotaError && (
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
                )
            }

            {/* <RateLimitStatus stats={stats} /> */}
        </div >
    );
};

export default ArchitectureDiagramGenerator;