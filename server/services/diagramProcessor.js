/**
 * Processes the unified LLM response to ensure consistency and provide
 * specific formatting for legacy or cloud views if needed.
 */

/**
 * Normalizes the raw diagram data from the LLM.
 * Ensures that even if the LLM misses some fields, they are present for the frontend.
 */
export const normalizeDiagram = (diagram) => {
    if (!diagram) return null;

    return {
        ...diagram,
        components: (diagram.components || []).map(comp => ({
            ...comp,
            cloudProvider: comp.cloudProvider || diagram.cloudProvider || 'none',
            cloudService: comp.cloudService || comp.type || 'Service',
            groupId: comp.groupId || null,
            technologies: comp.technologies || []
        })),
        connections: diagram.connections || [],
        layers: diagram.layers || [],
        groups: diagram.groups || [],
        cloudProvider: diagram.cloudProvider || 'none'
    };
};

/**
 * Specifically prepares a response for Legacy rendering by ensuring
 * standard fields are prioritized and cloud metadata is available but secondary.
 */
export const processDefaultDiagram = (diagram) => {
    const normalized = normalizeDiagram(diagram);
    // For legacy, we might want to ensure it looks 'clean' but still has cloud fields
    return normalized;
};

/**
 * Specifically prepares a response for Cloud rendering.
 */
export const processCloudDiagram = (diagram) => {
    return normalizeDiagram(diagram);
};
