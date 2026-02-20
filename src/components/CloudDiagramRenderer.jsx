import React from 'react';
import SvgDefs from './svg/SvgDefs';
import ConnectionLayer from './svg/ConnectionLayer';
import { useConnectionData } from '../hooks/useConnectionData';
import { getGroupStyle } from '../utils/cloudGroupStyles';
import { getCloudIcon, getCloudBadge, normalizeServiceName } from '../utils/cloudIcons';

const CloudDiagramRenderer = ({ diagram, activeConnection, setActiveConnection }) => {
    if (!diagram || !diagram.groups) return null;

    const connectionData = useConnectionData(diagram, {
        groups: diagram.groups,
        arrowIdPrefix: 'cloud-'
    });

    return (
        <svg
            id="architecture-svg"
            xmlns="http://www.w3.org/2000/svg"
            version="1.1"
            baseProfile="full"
            width={diagram.width}
            height={diagram.height}
            style={{ cursor: activeConnection !== null ? 'pointer' : 'default' }}
        >
            <SvgDefs idPrefix="cloud-" />

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

            {/* 1. Render group boundaries */}
            {[...diagram.groups]
                .sort((a, b) => b.width - a.width)
                .map(group => {
                    const style = getGroupStyle(diagram.cloudProvider, group.groupType);
                    return (
                        <g key={group.id}>
                            <rect
                                x={group.x} y={group.y}
                                width={group.width} height={group.height}
                                fill={style.fillColor}
                                stroke={style.borderColor}
                                strokeWidth={style.borderWidth}
                                strokeDasharray={style.borderStyle === 'dashed' ? '8,4' : 'none'}
                                rx={style.borderRadius}
                            />
                            {/* Group icon + label */}
                            {style.iconUrl && (
                                <image href={style.iconUrl} x={group.x + 8} y={group.y + 6}
                                    width={20} height={20} />
                            )}
                            <text x={group.x + (style.iconUrl ? 32 : 12)} y={group.y + 20}
                                fontSize="13" fontWeight="600" fill={style.labelColor}
                                style={{ fontFamily: 'sans-serif', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                {group.name}
                            </text>
                        </g>
                    );
                })}

            {/* 2. Render Connection Lines (Bottom Layer) */}
            <ConnectionLayer
                connectionData={connectionData}
                activeConnection={activeConnection}
                setActiveConnection={setActiveConnection}
            />

            {/* 3. Render Components (Top Layer) */}
            {diagram.components.map(comp => {
                const iconUrl = comp.cloudIconUrl || getCloudIcon(comp.cloudProvider || diagram.cloudProvider, normalizeServiceName(comp.cloudService || comp.name));

                // Highlight if part of active connection
                const isConnected = activeConnection !== null && connectionData.find(cd => cd.idx === activeConnection && (cd.fromComp.id === comp.id || cd.toComp.id === comp.id));
                const opacity = (activeConnection !== null && !isConnected) ? 0.4 : 1;
                const transform = isConnected
                    ? `translate(${comp.x - comp.width / 2}, ${comp.y - comp.height / 2}) scale(1.05)`
                    : `translate(${comp.x - comp.width / 2}, ${comp.y - comp.height / 2})`;

                return (
                    <g
                        key={comp.id}
                        transform={transform}
                        style={{
                            opacity,
                            transition: 'all 0.3s ease',
                            transformOrigin: `${comp.width / 2}px ${comp.height / 2}px`
                        }}
                    >
                        {/* Component Background (Permanent) */}
                        <rect
                            x={-4} y={-4}
                            width={comp.width + 8} height={comp.height + 8}
                            fill="rgba(59, 130, 246, 0.1)"
                            rx="12"
                        />

                        {/* Fallback Badge (hidden by default, shown on error) */}
                        <g
                            id={`fallback-badge-${comp.id}`}
                            style={{ display: 'none' }}
                        >
                            <circle
                                cx={comp.width / 2}
                                cy={44}
                                r={30}
                                fill={getCloudBadge(comp.cloudProvider || diagram.cloudProvider)?.color || '#9ca3af'}
                                stroke="#ffffff"
                                strokeWidth="2"
                            />
                            <text
                                x={comp.width / 2}
                                y={44}
                                fill="#ffffff"
                                fontSize="14"
                                fontWeight="bold"
                                textAnchor="middle"
                                dominantBaseline="central"
                            >
                                {getCloudBadge(comp.cloudProvider || diagram.cloudProvider)?.text || '?'}
                            </text>
                        </g>

                        <image
                            href={iconUrl}
                            x={(comp.width - 80) / 2}
                            y={4}
                            width={80}
                            height={80}
                            filter="url(#shadow-cloud)"
                            onError={(e) => {
                                e.target.style.display = 'none';
                                const fallback = document.getElementById(`fallback-badge-${comp.id}`);
                                if (fallback) fallback.style.display = 'block';
                            }}
                            style={{ transition: 'transform 0.2s' }}
                        />
                        <foreignObject x={0} y={90} width={comp.width} height={comp.height - 90}>
                            <div
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'flex-start',
                                    height: '100%',
                                    padding: '0 4px'
                                }}
                            >
                                <div
                                    title={comp.name}
                                    style={{
                                        textAlign: 'center',
                                        fontSize: '11px',
                                        fontWeight: '600',
                                        color: '#1f2937',
                                        lineHeight: '1.2',
                                        marginBottom: '4px',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        display: '-webkit-box',
                                        WebkitLineClamp: 2,
                                        WebkitBoxOrient: 'vertical',
                                        textShadow: '0 1px 2px rgba(255,255,255,0.8)',
                                    }}>
                                    {comp.name}
                                </div>

                                {/* Cloud Service Pill */}
                                {comp.cloudService && comp.cloudService.toLowerCase() !== (comp.name || '').toLowerCase() && (
                                    <div style={{
                                        fontSize: '9px',
                                        color: '#4b5563',
                                        background: '#e5e7eb',
                                        padding: '1px 6px',
                                        borderRadius: '10px',
                                        marginTop: '2px',
                                        maxWidth: '90%',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                        border: '1px solid #d1d5db'
                                    }}>
                                        {comp.cloudService}
                                    </div>
                                )}

                                {/* Technology Tags */}
                                {comp.technologies && comp.technologies.length > 0 && (
                                    <div style={{
                                        display: 'flex',
                                        gap: '3px',
                                        flexWrap: 'wrap',
                                        justifyContent: 'center',
                                        marginTop: '4px',
                                        maxWidth: '100%'
                                    }}>
                                        {comp.technologies
                                            .filter(tech => {
                                                const t = tech.toLowerCase();
                                                const n = (comp.name || '').toLowerCase();
                                                const s = (comp.cloudService || '').toLowerCase();
                                                return t !== n && t !== s;
                                            })
                                            .slice(0, 2).map((tech, i) => (
                                                <span key={i} style={{
                                                    fontSize: '8px',
                                                    color: '#374151',
                                                    background: '#f3f4f6',
                                                    padding: '1px 4px',
                                                    borderRadius: '3px',
                                                    border: '1px solid #e5e7eb'
                                                }}>
                                                    {tech}
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
    );
};

export default CloudDiagramRenderer;
