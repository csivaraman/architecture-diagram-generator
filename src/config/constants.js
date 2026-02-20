/**
 * Frontend Constants and Configuration
 */

// API Paths
export const API_ENDPOINTS = {
    GENERATE_DIAGRAM: '/api/generate-diagram',
    HEALTH: '/api/health',
    GEMINI_STATUS: '/api/gemini-status',
    GROQ_STATUS: '/api/groq-status',
};

// UI Related Constants
export const UI_CONSTANTS = {
    ZOOM_MIN: 0.5,
    ZOOM_MAX: 3.0,
    ZOOM_STEP: 0.2,
    TOAST_DURATION: 3000,
};

// Diagram Rendering Defaults
export const DIAGRAM_DEFAULTS = {
    COMPONENT_COLORS: {
        frontend: { bg: '#3b82f6', border: '#2563eb' },
        backend: { bg: '#10b981', border: '#059669' },
        database: { bg: '#f59e0b', border: '#d97706' },
        cache: { bg: '#ec4899', border: '#db2777' },
        queue: { bg: '#8b5cf6', border: '#7c3aed' },
        api: { bg: '#06b6d4', border: '#0891b2' },
        service: { bg: '#14b8a6', border: '#0d9488' },
        external: { bg: '#6b7280', border: '#4b5563' }
    },
    CONNECTOR_COLORS: [
        '#64748b', // Default gray
        '#3b82f6', // Blue
        '#10b981', // Green
        '#f59e0b', // Orange
        '#8b5cf6', // Purple
        '#ec4899', // Pink
        '#14b8a6', // Teal
        '#f97316', // Orange-red
    ]
};
