import React from 'react';
import { DIAGRAM_DEFAULTS } from '../config/constants.js';

const ComponentLegend = () => {
    const componentTypes = [
        'frontend', 'backend', 'database', 'cache',
        'queue', 'api', 'service', 'external'
    ];

    return (
        <div style={{
            marginTop: '1.5rem',
            padding: '1.25rem',
            background: '#f9fafb',
            borderRadius: '12px',
            border: '2px solid #e5e7eb'
        }}>
            <h4 style={{
                fontSize: '0.875rem',
                fontWeight: 700,
                color: '#1f2937',
                marginBottom: '0.75rem',
                textTransform: 'uppercase',
                LetterSpacing: '0.5px'
            }}>
                Component Types
            </h4>
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: '0.75rem'
            }}>
                {componentTypes.map(type => {
                    const colors = DIAGRAM_DEFAULTS.COMPONENT_COLORS[type] || DIAGRAM_DEFAULTS.COMPONENT_COLORS.service;
                    return (
                        <div key={type} style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.5rem',
                            background: 'white',
                            borderRadius: '6px',
                            border: '1px solid #e5e7eb'
                        }}>
                            <div style={{
                                width: '24px',
                                height: '24px',
                                background: colors.bg,
                                border: `2px solid ${colors.border}`,
                                borderRadius: '4px',
                                flexShrink: 0
                            }} />
                            <span style={{
                                fontSize: '0.8rem',
                                color: '#4b5563',
                                fontWeight: 500,
                                textTransform: 'capitalize'
                            }}>
                                {type}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default ComponentLegend;
