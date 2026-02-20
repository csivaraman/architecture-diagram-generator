import React from 'react';

const ConnectionLayer = ({ connectionData, activeConnection, setActiveConnection }) => (
    <>
        {/* Pass 1: All connector lines */}
        {connectionData.map(cd => {
            const { idx, pathD, pathSegments, color, isAsync, arrowIdPrefix } = cd;
            const isActive = activeConnection === idx;
            const strokeWidth = isActive ? 4 : 2.5;
            const opacity = isActive ? 1 : 0.85;

            return (
                <g key={`conn-lines-${idx}`}
                    onMouseEnter={() => setActiveConnection?.(idx)}
                    onMouseLeave={() => setActiveConnection?.(null)}
                    style={{ cursor: 'pointer', transition: 'all 0.3s ease' }}>

                    {/* Invisible wide hit target */}
                    <path d={pathD} stroke="transparent" strokeWidth="40" fill="none" />

                    {pathSegments.map((seg, segIdx) => (
                        <g key={`seg-${segIdx}`}>
                            <line {...segCoords(seg)} stroke={color}
                                strokeWidth={isActive ? 20 : 14}
                                strokeOpacity={isActive ? 0.2 : 0.05}
                                strokeLinecap="round" />
                            <line {...segCoords(seg)} stroke={color}
                                strokeWidth={strokeWidth}
                                strokeDasharray={seg.dashed ? '8,4' : (isAsync ? '6,4' : 'none')}
                                strokeLinecap="round"
                                markerEnd={segIdx === pathSegments.length - 1
                                    ? `url(#arrowhead-${arrowIdPrefix}${idx % 8})` : 'none'}
                                style={{
                                    opacity, filter: isActive
                                        ? 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' : 'none',
                                    transition: 'all 0.3s ease'
                                }} />
                        </g>
                    ))}
                </g>
            );
        })}

        {/* Pass 2: All labels on top */}
        {connectionData.map(cd => {
            const { idx, conn, labelPos, labelDim, color, arrowIdPrefix } = cd;
            if (!conn.label) return null;

            const isActive = activeConnection === idx;
            const hw = labelDim.width / 2;
            const hh = labelDim.height / 2;

            return (
                <g key={`conn-label-${idx}`}
                    transform={`translate(${labelPos.x}, ${labelPos.y})`}
                    onMouseEnter={() => setActiveConnection?.(idx)}
                    onMouseLeave={() => setActiveConnection?.(null)}
                    style={{ cursor: 'pointer', opacity: (activeConnection !== null && !isActive) ? 0.3 : 1, transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', transformOrigin: `${labelPos.x}px ${labelPos.y}px` }}
                    filter={isActive ? `url(#label-glow-${arrowIdPrefix}${idx % 8})` : 'none'}>

                    {/* Outer white halo to mask lines behind label */}
                    <rect x={-hw - 2} y={-hh - 2}
                        width={labelDim.width + 4} height={labelDim.height + 4}
                        fill="white" rx="7" />
                    {/* Visible label box */}
                    <rect x={-hw} y={-hh}
                        width={labelDim.width} height={labelDim.height}
                        fill="white" rx="6"
                        stroke={color} strokeWidth={isActive ? 2.5 : 1.5}
                        style={{ transition: 'all 0.3s ease' }} />
                    <text fontSize={isActive ? '11.5' : '10'} fontWeight="700"
                        fill={color} textAnchor="middle" dominantBaseline="central"
                        style={{ letterSpacing: isActive ? '0.3px' : '0px', transition: 'all 0.3s ease' }}>
                        {conn.label}
                    </text>
                </g>
            );
        })}
    </>
);

// Small helper to avoid repetition
const segCoords = seg => ({ x1: seg.x1, y1: seg.y1, x2: seg.x2, y2: seg.y2 });

export default ConnectionLayer;
