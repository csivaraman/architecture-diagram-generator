import React from 'react';
import { Download, ZoomIn, ZoomOut, Edit } from 'lucide-react';
import { openInDrawioWithLocalStorage } from '../utils/drawioIntegration.js';
import { downloadSVG } from '../utils/download.js';

const DiagramControls = ({ diagram, zoom, setZoom, viewMode, setViewMode }) => {
    return (
        <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1rem',
            paddingBottom: '1rem',
            borderBottom: '2px solid #f3f4f6'
        }}>
            {/* Empty div for flex spacing if we want tabs truly centered, but here we can just put tabs on the left or center */}
            <div style={{ flex: 1 }}></div>

            {/* Diagram Type Tabs */}
            {viewMode && setViewMode && (
                <div style={{ display: 'flex', justifyContent: 'center', flex: 1 }}>
                    <div style={{ background: '#f3f4f6', padding: '0.35rem', borderRadius: '12px', display: 'inline-flex', gap: '0.25rem' }}>
                        <button
                            onClick={() => setViewMode('default')}
                            style={{
                                padding: '0.6rem 1.75rem', border: 'none', background: viewMode === 'default' ? 'white' : 'transparent',
                                color: viewMode === 'default' ? '#1f2937' : '#6b7280', fontSize: '0.95rem', fontWeight: 600,
                                borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s', boxShadow: viewMode === 'default' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none'
                            }}
                        >
                            Default View
                        </button>
                        <button
                            onClick={() => setViewMode('cloud')}
                            style={{
                                padding: '0.6rem 1.75rem', border: 'none', background: viewMode === 'cloud' ? 'white' : 'transparent',
                                color: viewMode === 'cloud' ? '#1f2937' : '#6b7280', fontSize: '0.95rem', fontWeight: 600,
                                borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s', boxShadow: viewMode === 'cloud' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none'
                            }}
                        >
                            Cloud View
                        </button>
                    </div>
                </div>
            )}

            <div style={{
                display: 'flex',
                gap: '0.5rem',
                flex: 1,
                justifyContent: 'flex-end'
            }}>
                <button
                    onClick={() => setZoom(Math.min(zoom + 0.2, 3))}
                    style={{ padding: '0.5rem', background: '#f3f4f6', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
                    title="Zoom In"
                >
                    <ZoomIn size={20} />
                </button>
                <button
                    onClick={() => setZoom(Math.max(zoom - 0.2, 0.5))}
                    style={{ padding: '0.5rem', background: '#f3f4f6', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
                    title="Zoom Out"
                >
                    <ZoomOut size={20} />
                </button>
                <button
                    onClick={() => downloadSVG(diagram)}
                    style={{
                        padding: '0.5rem 1rem', background: '#667eea', color: 'white', border: 'none',
                        borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600
                    }}
                >
                    <Download size={20} />
                    Download SVG
                </button>
                {!diagram.isCloudMode && (
                    <button
                        onClick={() => openInDrawioWithLocalStorage(diagram)}
                        style={{
                            padding: '0.5rem 1rem', background: '#f59e0b', color: 'white', border: 'none',
                            borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600
                        }}
                    >
                        <Edit size={20} />
                        Edit in Draw.io
                    </button>
                )}
            </div>
        </div>
    );
};

export default DiagramControls;
