import React, { useState } from 'react';
import { getCloudIcon, getCloudBadge, normalizeServiceName } from '../utils/cloudIcons';
import {
    getComponentColor,
    redistributeOvercrowdedEdges,
    calculateConnectorPath,
    getConnectorColor,
    getDistributedPoint,
    findBestLabelPosition,
    findClearLabelPosition,
    measureLabelText
} from '../utils/diagramLayout';

const LegacyDiagramRenderer = ({ diagram, zoom, activeConnection, setActiveConnection }) => {
    if (!diagram) return null;

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

                {/* Label glow filters — one per connector color */}
                {['#64748b', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'].map((color, i) => (
                    <filter key={`label-glow-${i}`} id={`label-glow-${i}`} x="-40%" y="-40%" width="180%" height="180%">
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

            {/* Components rendered BEFORE connectors so connector lines are visible on top */}
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

            {
                (() => {
                    // Pre-calculate connection point distribution
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

                    // ── Pass 1: Compute all connection data ──────────────────
                    const placedLabels = [];
                    const connectionData = [];

                    diagram.connections.forEach((conn, idx) => {
                        const fromComp = diagram.components.find(c => c.id === conn.from);
                        const toComp = diagram.components.find(c => c.id === conn.to);
                        if (!fromComp || !toComp) return;

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

                        const obstacles = diagram.components
                            .filter(c => c.id !== fromComp.id && c.id !== toComp.id)
                            .map(c => ({
                                ...c,
                                left: c.x - c.width / 2 - 25,
                                right: c.x + c.width / 2 + 25,
                                top: c.y - c.height / 2 - 25,
                                bottom: c.y + c.height / 2 + 25
                            }));

                        const routeVariation = (idx % 3) * 15;
                        const detourOffset = ((idx % 3) - 1) * 90;

                        const { pathPoints, pathSegments } = calculateConnectorPath(
                            start, end, fromEdge, toEdge,
                            routeVariation, detourOffset, obstacles
                        );

                        const bestSegment = findBestLabelPosition(pathPoints);
                        const labelDims = measureLabelText(conn.label);
                        const labelPos = findClearLabelPosition(
                            pathPoints, bestSegment.index,
                            diagram.components, placedLabels,
                            labelDims.width, labelDims.height
                        );

                        const hw = labelDims.width / 2;
                        const hh = labelDims.height / 2;

                        const labelBound = {
                            left: labelPos.x - hw,
                            right: labelPos.x + hw,
                            top: labelPos.y - hh,
                            bottom: labelPos.y + hh
                        };
                        placedLabels.push(labelBound);

                        const connectorColor = getConnectorColor(idx, fromComp, toComp);

                        connectionData.push({
                            idx, conn, pathSegments, pathPoints,
                            labelPos, labelDims, labelBound,
                            hw, hh, connectorColor,
                            isAsync: conn.type === 'async'
                        });
                    });

                    // ── Pass 2: Render in two layers ─────────────────────────
                    return (
                        <>
                            {/* Layer 1: All connector lines */}
                            {connectionData.map(cd => {
                                const { idx, conn, pathSegments, connectorColor, isAsync } = cd;
                                const isActive = activeConnection === idx;
                                const strokeWidth = isActive ? 4 : 2.5;
                                const opacity = isActive ? 1 : 0.85;
                                const glowWidth = isActive ? 20 : 14;
                                const glowOpacity = isActive ? 0.2 : 0.05;

                                return (
                                    <g
                                        key={`conn-lines-${idx}`}
                                        onMouseEnter={() => setActiveConnection(idx)}
                                        onMouseLeave={() => setActiveConnection(null)}
                                        style={{ cursor: 'pointer', transition: 'all 0.3s ease' }}
                                    >
                                        {pathSegments.map((seg, segIdx) => (
                                            <g key={`seg-${segIdx}`}>
                                                {/* Glow */}
                                                <line
                                                    x1={seg.x1} y1={seg.y1}
                                                    x2={seg.x2} y2={seg.y2}
                                                    stroke={connectorColor}
                                                    strokeWidth={glowWidth}
                                                    strokeOpacity={glowOpacity}
                                                    strokeLinecap="round"
                                                    style={{ transition: 'all 0.3s ease' }}
                                                />
                                                {/* Main line */}
                                                <line
                                                    x1={seg.x1} y1={seg.y1}
                                                    x2={seg.x2} y2={seg.y2}
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
                                    </g>
                                );
                            })}

                            {/* Layer 2: All labels on top of ALL connector lines */}
                            {connectionData.map(cd => {
                                const { idx, conn, labelPos, labelDims, hw, hh, connectorColor } = cd;
                                const isActive = activeConnection === idx;

                                return (
                                    <g
                                        key={`conn-label-${idx}`}
                                        transform={`translate(${labelPos.x}, ${labelPos.y})`}
                                        onMouseEnter={() => setActiveConnection(idx)}
                                        onMouseLeave={() => setActiveConnection(null)}
                                        style={{
                                            cursor: 'pointer',
                                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                            transformOrigin: `${labelPos.x}px ${labelPos.y}px`
                                        }}
                                        filter={isActive ? `url(#label-glow-${idx % 8})` : 'none'}
                                    >
                                        <rect
                                            x={-hw - 2}
                                            y={-hh - 2}
                                            width={labelDims.width + 4}
                                            height={labelDims.height + 4}
                                            fill="white"
                                            rx="7"
                                            stroke="none"
                                        />
                                        <rect
                                            x={-hw}
                                            y={-hh}
                                            width={labelDims.width}
                                            height={labelDims.height}
                                            fill="white"
                                            rx="6"
                                            stroke={connectorColor}
                                            strokeWidth={isActive ? 2.5 : 1.5}
                                            style={{ transition: 'all 0.3s ease' }}
                                        />
                                        <text
                                            fontSize={isActive ? "11.5" : "10"}
                                            fontWeight="700"
                                            fill={connectorColor}
                                            textAnchor="middle"
                                            dominantBaseline="central"
                                            style={{
                                                transition: 'all 0.3s ease',
                                                letterSpacing: isActive ? '0.3px' : '0px'
                                            }}
                                        >
                                            {conn.label}
                                        </text>
                                    </g>
                                );
                            })}
                        </>
                    );
                })() // Invoke IIFE
            }
        </svg>
    );
};

export default LegacyDiagramRenderer;
