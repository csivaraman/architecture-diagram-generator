import React, { useMemo, useState } from 'react';
import { getGroupStyle } from '../utils/cloudGroupStyles';
import { getCloudIcon, getCloudBadge, normalizeServiceName } from '../utils/cloudIcons';
import {
    calculateConnectorPath,
    findClearLabelPosition,
    measureLabelText,
    getConnectorColor,
    redistributeOvercrowdedEdges,
    getDistributedPoint
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

    // 1. Pre-calculate connection point distribution (Two-pass approach)
    const connectionPoints = new Map();
    diagram.components.forEach(comp => {
        connectionPoints.set(comp.id, { top: [], bottom: [], left: [], right: [] });
    });

    diagram.connections.forEach((conn, idx) => {
        const fromComp = diagram.components.find(c => c.id === conn.from);
        const toComp = diagram.components.find(c => c.id === conn.to);
        if (!fromComp || !toComp) return;

        const dx = toComp.x - fromComp.x;
        const dy = toComp.y - fromComp.y;
        let fromEdge, toEdge;

        if (Math.abs(dy) > Math.abs(dx)) {
            if (dy > 0) { fromEdge = 'bottom'; toEdge = 'top'; }
            else { fromEdge = 'top'; toEdge = 'bottom'; }
        } else {
            if (dx > 0) { fromEdge = 'right'; toEdge = 'left'; }
            else { fromEdge = 'left'; toEdge = 'right'; }
        }

        connectionPoints.get(fromComp.id)[fromEdge].push({ connIdx: idx, direction: 'out', toCompId: toComp.id });
        connectionPoints.get(toComp.id)[toEdge].push({ connIdx: idx, direction: 'in', fromCompId: fromComp.id });
    });

    // Redistribute edges to avoid overcrowding
    redistributeOvercrowdedEdges(diagram.components, connectionPoints);

    // 2. Compute actual paths using distributed points
    const connectionData = diagram.connections.map((conn, idx) => {
        const fromComp = diagram.components.find(c => c.id === conn.from);
        const toComp = diagram.components.find(c => c.id === conn.to);
        if (!fromComp || !toComp) return null;

        // Find the actual edge assigned in connectionPoints
        const findAssignedEdge = (compId, connIdx) => {
            const points = connectionPoints.get(compId);
            if (!points) return 'bottom';
            for (const edge of ['top', 'bottom', 'left', 'right']) {
                if (points[edge].some(p => p.connIdx === connIdx)) {
                    return edge;
                }
            }
            return 'bottom';
        };

        const fromEdge = findAssignedEdge(fromComp.id, idx);
        const toEdge = findAssignedEdge(toComp.id, idx);

        const fromConnections = connectionPoints.get(fromComp.id)[fromEdge];
        const toConnections = connectionPoints.get(toComp.id)[toEdge];

        const fromIndex = fromConnections.findIndex(c => c.connIdx === idx);
        const toIndex = toConnections.findIndex(c => c.connIdx === idx);

        const start = getDistributedPoint(fromComp, fromEdge, fromIndex, fromConnections.length);
        const end = getDistributedPoint(toComp, toEdge, toIndex, toConnections.length);

        const { pathPoints, pathSegments } = calculateConnectorPath(
            start,
            end,
            fromEdge,
            toEdge,
            (idx % 3) * 15, // variation
            ((idx % 3) - 1) * 90, // detourOffset
            obstacles,
            { width: fromComp.width, height: fromComp.height, x: fromComp.x, y: fromComp.y },
            { width: toComp.width, height: toComp.height, x: toComp.x, y: toComp.y }
        );

        // Calculate path string for hover target (invisible thick line)
        const pathD = pathPoints.reduce((acc, p, i) => {
            return acc + (i === 0 ? `M ${p.x} ${p.y}` : ` L ${p.x} ${p.y}`);
        }, '');

        // Calculate label position
        let labelPos = { x: 0, y: 0 };
        let labelDim = { width: 0, height: 0 };

        if (conn.label) {
            labelDim = measureLabelText(conn.label);

            // PRIORITY: Find best segment based on VISIBLE (non-dashed) length
            let bestSegIdx = 0;
            const segmentVisibility = new Array(Math.max(0, pathPoints.length - 1)).fill(0);

            // Helper to check if point is on segment
            const isOnSegment = (pt, s1, s2) => {
                const crossProduct = (pt.y - s1.y) * (s2.x - s1.x) - (pt.x - s1.x) * (s2.y - s1.y);
                if (Math.abs(crossProduct) > 1) return false; // Not collinear
                const dotProduct = (pt.x - s1.x) * (s2.x - s1.x) + (pt.y - s1.y) * (s2.y - s1.y);
                if (dotProduct < 0) return false;
                const squaredLength = (s2.x - s1.x) ** 2 + (s2.y - s1.y) ** 2;
                return dotProduct <= squaredLength;
            };

            if (pathSegments) {
                pathSegments.forEach(seg => {
                    if (seg.dashed) return;
                    const len = Math.sqrt((seg.x2 - seg.x1) ** 2 + (seg.y2 - seg.y1) ** 2);
                    const mid = { x: (seg.x1 + seg.x2) / 2, y: (seg.y1 + seg.y2) / 2 };

                    // Find which logical segment this visual segment belongs to
                    for (let i = 0; i < pathPoints.length - 1; i++) {
                        if (isOnSegment(mid, pathPoints[i], pathPoints[i + 1])) {
                            segmentVisibility[i] += len;
                            break;
                        }
                    }
                });
            }

            let maxVis = -1;
            for (let i = 0; i < segmentVisibility.length; i++) {
                if (segmentVisibility[i] > maxVis) {
                    maxVis = segmentVisibility[i];
                    bestSegIdx = i;
                }
            }

            // Fallback: if no visible segments found, use longest logical segment
            if (maxVis <= 0) {
                let maxLen = 0;
                for (let i = 0; i < pathPoints.length - 1; i++) {
                    const dist = Math.sqrt((pathPoints[i + 1].x - pathPoints[i].x) ** 2 + (pathPoints[i + 1].y - pathPoints[i].y) ** 2);
                    if (dist > maxLen) { maxLen = dist; bestSegIdx = i; }
                }
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
            pathD,     // For hover target only
            pathSegments, // For visual rendering
            labelPos,
            labelDim,
            color: getConnectorColor(idx)
        };
    }).filter(Boolean);


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
            <defs>
                {/* 1. Arrow Markers for each color */}
                {[0, 1, 2, 3, 4, 5, 6, 7].map(i => {
                    const colors = ['#64748b', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];
                    return (
                        <marker
                            key={`arrow-cloud-${i}`}
                            id={`arrowhead-cloud-${i}`}
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

                        {/* Visible path segments */}
                        {cd.pathSegments && cd.pathSegments.map((seg, segIdx) => (
                            <g key={`seg-${segIdx}`}>
                                {/* Glow Halo */}
                                <line
                                    x1={seg.x1} y1={seg.y1}
                                    x2={seg.x2} y2={seg.y2}
                                    stroke={color}
                                    strokeWidth={isActive ? 20 : 14}
                                    strokeOpacity={isActive ? 0.2 : 0.05}
                                    strokeLinecap="round"
                                    style={{ transition: 'all 0.3s ease' }}
                                />
                                {/* Main Line */}
                                <line
                                    x1={seg.x1} y1={seg.y1}
                                    x2={seg.x2} y2={seg.y2}
                                    stroke={color}
                                    strokeWidth={strokeWidth}
                                    strokeDasharray={seg.dashed ? '6,3' : (conn.type === 'async' ? '6,4' : 'none')}
                                    strokeLinecap="round"
                                    markerEnd={segIdx === cd.pathSegments.length - 1 ? `url(#arrowhead-cloud-${idx % 8})` : 'none'}
                                    style={{
                                        opacity,
                                        transition: 'all 0.2s',
                                        filter: isActive ? 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' : 'none'
                                    }}
                                />
                            </g>
                        ))}
                    </g>
                );
            })}

            {/* 3. Render Components (Middle Layer) */}
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
                        {/* Hover/Active Effect Background */}
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
                            fontSize={isActive ? "11.5" : "10"}
                            textAnchor="middle"
                            dominantBaseline="central"
                            fontWeight="600"
                            style={{
                                transition: 'all 0.2s',
                                letterSpacing: isActive ? '0.3px' : '0px'
                            }}
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
