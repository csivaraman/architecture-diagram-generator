import React from 'react';
import { Download, ZoomIn, ZoomOut, Edit } from 'lucide-react';
import { openInDrawioWithLocalStorage } from '../utils/drawioIntegration.js';
import { downloadSVG } from '../utils/download.js';

const DiagramControls = ({ diagram, zoom, setZoom }) => {
    return (
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
