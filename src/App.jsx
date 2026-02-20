import React, { useState, useEffect } from 'react';
import { Network, AlertCircle, Info, AlertTriangle, Linkedin } from 'lucide-react';
import { useDiagramGeneration } from './hooks/useDiagramGeneration.js';
import SystemInputForm from './components/SystemInputForm.jsx';
import DiagramControls from './components/DiagramControls.jsx';
import ComponentLegend from './components/ComponentLegend.jsx';
import CloudDiagramRenderer from './components/CloudDiagramRenderer.jsx';
import LegacyDiagramRenderer from './components/LegacyDiagramRenderer.jsx';
import TestRunner from './test/TestRunner.jsx';

const ArchitectureDiagramGenerator = () => {
    const [description, setDescription] = useState('');
    const [provider, setProvider] = useState('gemini');
    const [viewMode, setViewMode] = useState('default');
    const [zoom, setZoom] = useState(1);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [isTablet, setIsTablet] = useState(window.innerWidth >= 768 && window.innerWidth < 1024);
    const [activeConnection, setActiveConnection] = useState(null);

    const {
        diagram,
        loading,
        error,
        quotaExceeded,
        generateDiagram,
        setQuotaExceeded,
        setError
    } = useDiagramGeneration();

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
            setIsTablet(window.innerWidth >= 768 && window.innerWidth < 1024);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const handleGenerate = (overrideDescription) => {
        const descToUse = (typeof overrideDescription === 'string') ? overrideDescription : description;
        if (!descToUse) {
            setError('Please provide a system description');
            return;
        }
        generateDiagram(descToUse, provider, 'auto', isMobile, isTablet);
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
                    <TestRunner generateDiagram={handleGenerate} />
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

                {/* Input Container */}
                <div style={{ background: 'white', borderRadius: '20px', padding: isMobile ? '1.5rem' : '2.5rem', marginBottom: '2rem', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', animation: 'fadeInUp 0.6s ease-out 0.1s both' }}>
                    {/* AI Accuracy Disclaimer */}
                    <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '12px', padding: '1rem', marginBottom: '1.5rem', display: 'flex', gap: '0.75rem', alignItems: 'start' }}>
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

                    <SystemInputForm
                        description={description}
                        setDescription={setDescription}
                        loading={loading}
                        provider={provider}
                        setProvider={setProvider}
                        onGenerate={() => handleGenerate(description)}
                    />

                    {error && (
                        <div style={{ marginTop: '1rem', padding: '1rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#991b1b', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                            <AlertCircle size={20} style={{ flexShrink: 0, marginTop: '0.125rem' }} />
                            <div>{error}</div>
                        </div>
                    )}
                </div>

                {/* Diagram Display Container */}
                {diagram && (() => {
                    const isCloudModeView = viewMode === 'cloud';
                    const activeDiagram = isCloudModeView ? (diagram.cloudVersion || diagram) : (diagram.legacyVersion || diagram);

                    return (
                        <div style={{ background: 'white', borderRadius: '20px', padding: isMobile ? '1rem' : '2rem', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
                            <DiagramControls
                                diagram={activeDiagram}
                                zoom={zoom}
                                setZoom={setZoom}
                                viewMode={viewMode}
                                setViewMode={setViewMode}
                            />

                            <div id="architecture-svg-container" style={{ overflow: 'auto', background: isCloudModeView ? '#fff' : '#f9fafb', borderRadius: '12px', padding: '2rem', minHeight: '600px' }}>
                                {isCloudModeView ? (
                                    <div style={{ transform: `scale(${zoom})`, transformOrigin: 'top left', transition: 'transform 0.2s' }}>
                                        <CloudDiagramRenderer
                                            diagram={activeDiagram}
                                            activeConnection={activeConnection}
                                            setActiveConnection={setActiveConnection}
                                        />
                                    </div>
                                ) : (
                                    <LegacyDiagramRenderer
                                        diagram={activeDiagram}
                                        zoom={zoom}
                                        activeConnection={activeConnection}
                                        setActiveConnection={setActiveConnection}
                                    />
                                )}
                            </div>

                            <ComponentLegend />
                        </div>
                    );
                })()}

                {/* Footer Note */}
                <div style={{ marginTop: '3rem', textAlign: 'center', color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', paddingBottom: '2rem' }}>
                    <a
                        href="https://www.linkedin.com/in/csivaraman/"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                            display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'white', textDecoration: 'none',
                            fontWeight: 500, padding: '0.5rem 1.25rem', background: 'rgba(255,255,255,0.1)', borderRadius: '9999px',
                            border: '1px solid rgba(255,255,255,0.2)', transition: 'all 0.2s ease'
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
            {quotaExceeded && (
                <div style={{
                    position: 'fixed', bottom: '24px', right: '24px', maxWidth: '400px', background: 'white',
                    padding: '1.25rem', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
                    borderLeft: '6px solid #ef4444', display: 'flex', gap: '1rem', alignItems: 'start', zIndex: 1000,
                    animation: 'fadeInUp 0.3s ease-out'
                }}>
                    <AlertTriangle size={24} color="#ef4444" style={{ flexShrink: 0 }} />
                    <div>
                        <h4 style={{ margin: '0 0 0.25rem', color: '#1f2937', fontSize: '1rem', fontWeight: 700 }}>
                            {quotaExceeded.title || 'API Quota Exceeded'}
                        </h4>
                        <p style={{ margin: 0, color: '#4b5563', fontSize: '0.9rem', lineHeight: '1.4' }}>
                            {quotaExceeded.message || 'Service temporarily unavailable. Please try again later.'}
                        </p>
                        <button
                            onClick={() => setQuotaExceeded(false)}
                            style={{
                                display: 'block', marginTop: '0.75rem', border: 'none', background: 'transparent',
                                color: '#ef4444', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', padding: 0
                            }}
                        >
                            Dismiss
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ArchitectureDiagramGenerator;