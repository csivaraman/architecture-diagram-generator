import { getCloudIcon, getCloudBadge, normalizeServiceName } from './cloudIcons';

export const layoutDiagram = (architecture, systemName, { isMobile, isTablet }) => {
    const COMPONENT_WIDTH = isMobile ? 150 : (isTablet ? 180 : 220);
    const COMPONENT_HEIGHT = isMobile ? 110 : 130;
    const COMPONENT_GAP_X = isMobile ? 40 : (isTablet ? 60 : 80);
    const LAYER_HEIGHT = isMobile ? 200 : 250;
    const TITLE_SPACE = 50;
    const PADDING_TOP = (isMobile ? 40 : 60) + TITLE_SPACE;
    const PADDING_SIDE = isMobile ? 40 : (isTablet ? 60 : 100);
    const LAYER_LABEL_HEIGHT = 50;

    // 0. Pre-processing: Heal orphaned components (fix ID mismatches)
    const allLayerComponentIds = new Set(architecture.layers.flatMap(l => l.componentIds));
    const orphanedComponents = architecture.components.filter(c => !allLayerComponentIds.has(c.id));

    if (orphanedComponents.length > 0) {
        console.warn(`[Layout] Found ${orphanedComponents.length} orphaned components. Healing...`, orphanedComponents);
        let targetLayerIndex = architecture.layers.findIndex(l => l.name.toLowerCase().includes('application'));
        if (targetLayerIndex === -1) targetLayerIndex = 1;
        if (targetLayerIndex >= architecture.layers.length) targetLayerIndex = 0;
        architecture.layers[targetLayerIndex].componentIds.push(...orphanedComponents.map(c => c.id));
    }

    // 0.1 Pre-processing: Heal isolated components
    architecture.components.forEach(comp => {
        const hasConnection = architecture.connections.some(conn => conn.from === comp.id || conn.to === comp.id);
        if (!hasConnection) {
            console.warn(`[Layout] Component ${comp.id} is isolated. Healing connection...`);
            let targetId = null;
            const gateway = architecture.components.find(c => c.name.toLowerCase().includes('gateway') || c.name.toLowerCase().includes('api'));
            if (gateway && gateway.id !== comp.id) {
                targetId = gateway.id;
            } else {
                const connectionCounts = {};
                architecture.connections.forEach(c => {
                    connectionCounts[c.from] = (connectionCounts[c.from] || 0) + 1;
                    connectionCounts[c.to] = (connectionCounts[c.to] || 0) + 1;
                });
                targetId = Object.keys(connectionCounts).reduce((a, b) => connectionCounts[a] > connectionCounts[b] ? a : b, null);
            }

            if (targetId) {
                architecture.connections.push({
                    from: targetId,
                    to: comp.id,
                    label: 'Inferred',
                    type: 'sync'
                });
            }
        }
    });

    // 0.2 Filter out empty layers
    const originalLayerCount = architecture.layers.length;
    architecture.layers = architecture.layers.filter(l => l.componentIds.length > 0);
    const removedLayers = originalLayerCount - architecture.layers.length;

    // Distribute some of the saved space to remaining layers (breathing room)
    // 50% of saved space is redistributed
    const heightBonus = removedLayers > 0 ? (removedLayers * 250 / architecture.layers.length) * 0.5 : 0;
    const FINAL_LAYER_HEIGHT = LAYER_HEIGHT + heightBonus;

    // 1. Sort components in layers
    const layerSortedComponentIds = [];
    architecture.layers.forEach((layer, layerIdx) => {
        if (layerIdx === 0) {
            layerSortedComponentIds.push(layer.componentIds);
        } else {
            const prevLayerIds = layerSortedComponentIds[layerIdx - 1];
            const sortedIds = [...layer.componentIds].sort((a, b) => {
                const getAvgPos = (compId) => {
                    const connections = architecture.connections.filter(c =>
                        (c.from === compId && prevLayerIds.includes(c.to)) ||
                        (c.to === compId && prevLayerIds.includes(c.from))
                    );
                    if (connections.length === 0) return prevLayerIds.length / 2;
                    const sum = connections.reduce((acc, c) => {
                        const otherId = c.from === compId ? c.to : c.from;
                        return acc + prevLayerIds.indexOf(otherId);
                    }, 0);
                    return sum / connections.length;
                };
                return getAvgPos(a) - getAvgPos(b);
            });
            layerSortedComponentIds.push(sortedIds);
        }
    });

    // 2. Calculate Dynamic Canvas Width
    let maxComponentsInLayer = 0;
    layerSortedComponentIds.forEach(ids => {
        maxComponentsInLayer = Math.max(maxComponentsInLayer, ids.length);
    });

    const calculatedWidth = (maxComponentsInLayer * (COMPONENT_WIDTH + COMPONENT_GAP_X)) + (PADDING_SIDE * 2);
    const width = Math.max(isMobile ? 350 : 1200, calculatedWidth);
    const height = PADDING_TOP + (architecture.layers.length * FINAL_LAYER_HEIGHT) + 40;

    const components = architecture.components.map(comp => {
        const layerIndex = architecture.layers.findIndex(layer =>
            layer.componentIds.includes(comp.id)
        );

        const sortedIds = layerSortedComponentIds[layerIndex] || architecture.layers[layerIndex]?.componentIds || [];
        const componentsInLayer = sortedIds.length;
        const indexInLayer = sortedIds.indexOf(comp.id);

        const totalLayerContentWidth = componentsInLayer * COMPONENT_WIDTH + (componentsInLayer - 1) * COMPONENT_GAP_X;
        const startX = (width - totalLayerContentWidth) / 2;

        const normalizedService = comp.cloudService ? normalizeServiceName(comp.cloudService) : '';
        const cloudIconUrl = comp.cloudProvider ? getCloudIcon(comp.cloudProvider, normalizedService) : null;
        const cloudBadge = comp.cloudProvider ? getCloudBadge(comp.cloudProvider) : null;

        return {
            ...comp,
            x: startX + indexInLayer * (COMPONENT_WIDTH + COMPONENT_GAP_X) + COMPONENT_WIDTH / 2,
            y: PADDING_TOP + (layerIndex * FINAL_LAYER_HEIGHT) + LAYER_LABEL_HEIGHT + (FINAL_LAYER_HEIGHT - LAYER_LABEL_HEIGHT) / 2,
            width: COMPONENT_WIDTH,
            height: COMPONENT_HEIGHT,
            layerIndex,
            cloudIconUrl,
            cloudBadge,
            normalizedService
        };
    });

    return {
        systemName,
        width,
        height,
        components,
        connections: architecture.connections,
        layers: architecture.layers,
        layerHeight: LAYER_HEIGHT,
        paddingTop: PADDING_TOP,
        layerLabelHeight: LAYER_LABEL_HEIGHT
    };
};

export const redistributeOvercrowdedEdges = (components, connectionPoints) => {
    components.forEach(comp => {
        const points = connectionPoints.get(comp.id);

        // Check each edge
        ['top', 'bottom', 'left', 'right'].forEach(edge => {
            if (points[edge].length > 3) {
                // Move some connections to adjacent edges
                const overflow = points[edge].splice(3);

                // Determine adjacent edges
                const adjacentEdges = edge === 'top' || edge === 'bottom'
                    ? ['left', 'right']
                    : ['top', 'bottom'];

                // Distribute overflow to adjacent edges
                overflow.forEach((conn, i) => {
                    const targetEdge = adjacentEdges[i % 2];
                    points[targetEdge].push(conn);
                });
            }
        });
    });
};

export const getComponentColor = (type) => {
    const colors = {
        frontend: { bg: '#3b82f6', border: '#2563eb' },
        backend: { bg: '#10b981', border: '#059669' },
        database: { bg: '#f59e0b', border: '#d97706' },
        cache: { bg: '#ec4899', border: '#db2777' },
        queue: { bg: '#8b5cf6', border: '#7c3aed' },
        api: { bg: '#06b6d4', border: '#0891b2' },
        service: { bg: '#14b8a6', border: '#0d9488' },
        external: { bg: '#6b7280', border: '#4b5563' }
    };
    return colors[type] || colors.service;
};

/**
 * Generates a color based on connection index for visual distinction
 * @param {number} idx 
 * @returns {string} Hex color code
 */
export const getConnectorColor = (idx) => {
    const colors = [
        '#64748b', // Default gray
        '#3b82f6', // Blue
        '#10b981', // Green
        '#f59e0b', // Orange
        '#8b5cf6', // Purple
        '#ec4899', // Pink
        '#14b8a6', // Teal
        '#f97316', // Orange-red
    ];
    return colors[idx % colors.length];
};

/**
 * Calculates the exact point for a connection on a component's edge
 */
export const getDistributedPoint = (comp, edge, index, total) => {
    const EDGE_PADDING = 30;

    if (total <= 1) {
        switch (edge) {
            case 'top':
                return { x: comp.x, y: comp.y - comp.height / 2 };
            case 'bottom':
                return { x: comp.x, y: comp.y + comp.height / 2 };
            case 'left':
                return { x: comp.x - comp.width / 2, y: comp.y };
            case 'right':
                return { x: comp.x + comp.width / 2, y: comp.y };
            default:
                return { x: comp.x, y: comp.y };
        }
    }

    if (edge === 'top' || edge === 'bottom') {
        const EDGE_PADDING = 30;
        const availableWidth = comp.width - (2 * EDGE_PADDING);
        const PREFERRED_GAP = 40; // tighter clustering

        // Check if we can cluster centrally
        const requiredSpan = total > 1 ? (total - 1) * PREFERRED_GAP : 0;

        if (requiredSpan <= availableWidth) {
            // Cluster Centrally
            const startX = comp.x - requiredSpan / 2;
            const x = startX + (index * PREFERRED_GAP);
            const y = edge === 'top' ? comp.y - comp.height / 2 : comp.y + comp.height / 2;
            return { x, y };
        } else {
            // Spread to fit
            const spacing = total > 1 ? availableWidth / (total - 1) : 0;
            const startX = comp.x - comp.width / 2 + EDGE_PADDING;
            const x = startX + (index * spacing);
            const y = edge === 'top' ? comp.y - comp.height / 2 : comp.y + comp.height / 2;
            return { x, y };
        }
    } else {
        const EDGE_PADDING = 30;
        const availableHeight = comp.height - (2 * EDGE_PADDING);
        const PREFERRED_GAP = 40;

        const requiredSpan = total > 1 ? (total - 1) * PREFERRED_GAP : 0;

        if (requiredSpan <= availableHeight) {
            // Cluster Centrally
            const startY = comp.y - requiredSpan / 2;
            const y = startY + (index * PREFERRED_GAP);
            const x = edge === 'left' ? comp.x - comp.width / 2 : comp.x + comp.width / 2;
            return { x, y };
        } else {
            // Spread to fit
            const spacing = total > 1 ? availableHeight / (total - 1) : 0;
            const startY = comp.y - comp.height / 2 + EDGE_PADDING;
            const y = startY + (index * spacing);
            const x = edge === 'left' ? comp.x - comp.width / 2 : comp.x + comp.width / 2;
            return { x, y };
        }
    }
};
