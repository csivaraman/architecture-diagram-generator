import React from 'react';

const CONNECTOR_COLORS = [
    '#64748b', '#3b82f6', '#10b981', '#f59e0b',
    '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'
];

const SvgDefs = ({ idPrefix = '' }) => (
    <defs>
        {CONNECTOR_COLORS.map((color, i) => (
            <marker
                key={`arrow-${idPrefix}${i}`}
                id={`arrowhead-${idPrefix}${i}`}
                markerWidth="10" markerHeight="10"
                refX="9" refY="5" orient="auto"
            >
                <path d="M 0 0 L 10 5 L 0 10 z" fill={color} />
            </marker>
        ))}

        <filter id={`shadow-${idPrefix}`} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="2" dy="4" stdDeviation="4" floodOpacity="0.15" />
        </filter>

        {CONNECTOR_COLORS.map((color, i) => (
            <filter key={`label-glow-${idPrefix}${i}`}
                id={`label-glow-${idPrefix}${i}`}
                x="-40%" y="-40%" width="180%" height="180%">
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
);

export default SvgDefs;
export { CONNECTOR_COLORS };
