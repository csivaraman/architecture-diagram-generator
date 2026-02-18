import React, { useState } from 'react';
import { getGroupStyle } from '../utils/cloudGroupStyles';
import { getCloudIcon, normalizeServiceName } from '../utils/cloudIcons';
import {
    calculateConnectorPath,
    findClearLabelPosition,
    measureLabelText,
    getConnectorColor
} from '../utils/diagramLayout';

const CloudDiagramRenderer = ({ diagram, activeConnection, setActiveConnection }) => {
    if (!diagram || !diagram.groups) return null;

    // Helper to get obstacles for routing (components + groups)
    const getObstacles = () => {
        const obstacles = [];
        diagram.components.forEach(c => {
            obstacles.push({
                left: c.x - c.width / 2 - 10,
                right: c.x + c.width / 2 + 10,
                top: c.y - c.height / 2 - 10,
                bottom: c.y + c.height / 2 + 10
            });
        });
        return obstacles;
    };

    const obstacles = getObstacles();
    const placedLabels = []; // Track label positions to avoid collisions

    // Pre-calculate connection data for two-pass rendering
    const connectionData = diagram.connections.map((conn, idx) => {
        const fromComp = diagram.components.find(c => c.id === conn.from);
        const toComp = diagram.components.find(c => c.id === conn.to);
        if (!fromComp || !toComp) return null;

        // Determine edges based on relative position
        let fromEdge = 'right', toEdge = 'left';
        const dx = toComp.x - fromComp.x;
        const dy = toComp.y - fromComp.y;

        if (Math.abs(dy) > Math.abs(dx)) {
            if (dy > 0) { fromEdge = 'bottom'; toEdge = 'top'; }
            else { fromEdge = 'top'; toEdge = 'bottom'; }
        } else {
            if (dx > 0) { fromEdge = 'right'; toEdge = 'left'; }
            else { fromEdge = 'left'; toEdge = 'right'; }
        }

        const { pathPoints } = calculateConnectorPath(
            { x: fromComp.x, y: fromComp.y },
            { x: toComp.x, y: toComp.y },
            fromEdge,
            toEdge,
            0, // variation
            40, // detour
            obstacles,
            { width: 64, height: 64 }, // Cloud component icon size (approx)
            { width: 64, height: 64 }
        );

        // Calculate path string
        const pathD = pathPoints.reduce((acc, p, i) => {
            return acc + (i === 0 ? `M ${p.x} ${p.y}` : ` L ${p.x} ${p.y}`);
        }, '');

        // Calculate label position
        let labelPos = { x: 0, y: 0 };
        let labelDim = { width: 0, height: 0 };

        if (conn.label) {
            labelDim = measureLabelText(conn.label);
            let bestSegIdx = 0;
            let maxLen = 0;
            for (let i = 0; i < pathPoints.length - 1; i++) {
                const dist = Math.sqrt((pathPoints[i + 1].x - pathPoints[i].x) ** 2 + (pathPoints[i + 1].y - pathPoints[i].y) ** 2);
                if (dist > maxLen) { maxLen = dist; bestSegIdx = i; }
            }

            labelPos = findClearLabelPosition(
                pathPoints,
                bestSegIdx,
                diagram.components,
                placedLabels,
                labelDim.width,
                labelDim.height,
                diagram.groups // Pass groups for collision detection
            );

            placedLabels.push({
                left: labelPos.x - labelDim.width / 2,
                right: labelPos.x + labelDim.width / 2,
                top: labelPos.y - labelDim.height / 2,
                bottom: labelPos.y + labelDim.height / 2
            });
        }

        return {
            idx,
            conn,
            fromComp,
            toComp,
            pathD,
            labelPos,
            labelDim,
            color: getConnectorColor(idx)
        };
    }).filter(Boolean);

    return (
        <svg
            id="architecture-svg"
            width={diagram.width}
            height={diagram.height}
            style={{ cursor: activeConnection !== null ? 'pointer' : 'default' }}
        >
            <defs>
                {/* 1. Arrow Markers for each color */}
                {[0, 1, 2, 3, 4, 5, 6, 7].map(i => {
                    const colors = ['#64748b', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];
                    return (
                        <marker
                            key={`arrow-cloud-${i}`}
                            id={`arrowhead-cloud-${i}`}
                            markerWidth="10"
                            markerHeight="7"
                            refX="9"
                            refY="3.5"
                            orient="auto"
                        >
                            <polygon points="0 0, 10 3.5, 0 7" fill={colors[i]} />
                        </marker>
                    );
                })}

                {/* 2. Drop Shadow Filter */}
                <filter id="shadow-cloud" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="2" dy="4" stdDeviation="4" floodOpacity="0.15" />
                </filter>

                {/* 3. Label Glow Filter */}
                {['#64748b', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'].map((color, i) => (
                    <filter key={`label-glow-cloud-${i}`} id={`label-glow-cloud-${i}`} x="-40%" y="-40%" width="180%" height="180%">
                        <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
                        <feFlood floodColor={color} floodOpacity="0.35" result="color" />
                        <feComposite in="color" in2="blur" operator="in" result="coloredBlur" />
                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                ))}
            </defs>

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
                                style={{ fontFamily: 'sans-serif' }}>
                                {group.name}
                            </text>
                        </g>
                    );
                })}

            {/* 2. Render Connector Lines (Bottom Layer) */}
            {connectionData.map(cd => {
                const { idx, pathD, color, conn } = cd;
                const isActive = activeConnection === idx;
                const strokeWidth = isActive ? 4 : 2;
                const opacity = (activeConnection !== null && !isActive) ? 0.3 : 1;

                return (
                    <g
                        key={`conn-line-${idx}`}
                        onMouseEnter={() => setActiveConnection && setActiveConnection(idx)}
                        onMouseLeave={() => setActiveConnection && setActiveConnection(null)}
                        style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                    >
                        {/* Invisible thick path for easier hovering */}
                        <path d={pathD} stroke="transparent" strokeWidth="40" fill="none" />

                        {/* Visible path */}
                        <path
                            d={pathD}
                            stroke={color}
                            strokeWidth={strokeWidth}
                            fill="none"
                            markerEnd={`url(#arrowhead-cloud-${idx % 8})`}
                            strokeLinejoin="round"
                            strokeDasharray={conn.type === 'async' ? '6,4' : 'none'}
                            style={{
                                opacity,
                                transition: 'all 0.2s',
                                filter: isActive ? 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' : 'none'
                            }}
                        />
                    </g>
                );
            })}

            {/* 3. Render Components (Middle Layer) */}
            {diagram.components.map(comp => {
                const iconUrl = comp.cloudIconUrl || getCloudIcon(comp.cloudProvider || diagram.cloudProvider, normalizeServiceName(comp.cloudService || comp.name));

                // Highlight if part of active connection
                const isConnected = activeConnection !== null && connectionData.find(cd => cd.idx === activeConnection && (cd.fromComp.id === comp.id || cd.toComp.id === comp.id));
                const opacity = (activeConnection !== null && !isConnected) ? 0.4 : 1;
                const transform = isConnected ? `scale(1.05) translate(${comp.x - comp.width / 2}, ${comp.y - comp.height / 2})` : `translate(${comp.x - comp.width / 2}, ${comp.y - comp.height / 2})`;

                return (
                    <g
                        key={comp.id}
                        transform={`translate(${comp.x - comp.width / 2}, ${comp.y - comp.height / 2})`}
                        style={{
                            opacity,
                            transition: 'all 0.3s ease',
                            transformOrigin: `${comp.width / 2}px ${comp.height / 2}px`
                        }}
                    >
                        {/* Hover/Active Effect Background */}
                        {isConnected && (
                            <rect
                                x={-4} y={-4}
                                width={comp.width + 8} height={comp.height + 8}
                                fill="rgba(59, 130, 246, 0.1)"
                                rx="12"
                            />
                        )}

                        <image
                            href={iconUrl}
                            x={(comp.width - 64) / 2}
                            y={4}
                            width={64}
                            height={64}
                            filter="url(#shadow-cloud)"
                            onError={(e) => { e.target.style.display = 'none'; }}
                            style={{ transition: 'transform 0.2s' }}
                        />
                        <foreignObject x={0} y={70} width={comp.width} height={40}>
                            <div style={{
                                textAlign: 'center',
                                fontSize: '11px',
                                fontWeight: '500',
                                color: '#1f2937',
                                lineHeight: '1.2',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                textShadow: '0 1px 2px rgba(255,255,255,0.8)'
                            }}>
                                {comp.name}
                            </div>
                        </foreignObject>
                    </g>
                );
            })}

            {/* 4. Render Connection Labels (Top Layer) */}
            {connectionData.map(cd => {
                const { idx, labelPos, labelDim, color, conn } = cd;
                if (!conn.label) return null;

                const isActive = activeConnection === idx;
                const opacity = (activeConnection !== null && !isActive) ? 0.3 : 1;

                return (
                    <g
                        key={`conn-label-${idx}`}
                        transform={`translate(${labelPos.x}, ${labelPos.y})`}
                        onMouseEnter={() => setActiveConnection && setActiveConnection(idx)}
                        onMouseLeave={() => setActiveConnection && setActiveConnection(null)}
                        style={{
                            cursor: 'pointer',
                            opacity,
                            transition: 'all 0.2s'
                        }}
                        filter={isActive ? `url(#label-glow-cloud-${idx % 8})` : 'none'}
                    >
                        <rect
                            x={-labelDim.width / 2 - 4}
                            y={-12}
                            width={labelDim.width + 8}
                            height={24}
                            fill="#ffffff"
                            rx={4}
                            stroke={color}
                            strokeWidth={isActive ? 2.5 : 1.5}
                            style={{ transition: 'all 0.2s' }}
                        />
                        <text
                            x={0}
                            y={0}
                            fill={color}
                            fontSize={isActive ? "12" : "11"}
                            textAnchor="middle"
                            dominantBaseline="central"
                            fontWeight="600"
                            style={{ transition: 'all 0.2s' }}
                        >
                            {conn.label}
                        </text>
                    </g>
                );
            })}
        </svg>
    );
};

export default CloudDiagramRenderer;
