import React from 'react';
import SvgDefs from './svg/SvgDefs';
import ConnectionLayer from './svg/ConnectionLayer';
import { useConnectionData } from '../hooks/useConnectionData';
import { getComponentColor } from '../utils/diagramLayout';
import { getCloudIcon, getCloudBadge, normalizeServiceName } from '../utils/cloudIcons';

const LegacyDiagramRenderer = ({ diagram, zoom, activeConnection, setActiveConnection }) => {
    if (!diagram) return null;

    const connectionData = useConnectionData(diagram, { arrowIdPrefix: '' });

    return (
        <svg
            id="architecture-svg"
            xmlns="http://www.w3.org/2000/svg"
            version="1.1"
            baseProfile="full"
            width={diagram.width}
            height={diagram.height}
            style={{ transform: `scale(${zoom})`, transformOrigin: 'top left', transition: 'transform 0.2s', background: 'white' }}
        >
            <rect width={diagram.width} height={diagram.height} fill="white" />

            <SvgDefs idPrefix="" />

            <text
                x={diagram.width / 2}
                y={50}
                fontSize="24"
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
                            filter="url(#shadow-)"
                        />

                        {/* Cloud Provider Icon Badge */}
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

                        {/* Fallback: Colored Badge if icon fails */}
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
                                paddingRight: cloudIconUrl ? '32px' : '8px'
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

                                {/* Show cloud service name */}
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

            <ConnectionLayer
                connectionData={connectionData}
                activeConnection={activeConnection}
                setActiveConnection={setActiveConnection}
            />

        </svg>
    );
};

export default LegacyDiagramRenderer;
