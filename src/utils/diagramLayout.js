import { getCloudIcon, getCloudBadge, normalizeServiceName } from './cloudIcons';


export const calculateConnectorPath = (start, end, fromEdge, toEdge, routeVariation, detourOffset, obstacles) => {
    let pathPoints = [];

    if (fromEdge === 'bottom' && toEdge === 'top') {
        const midY = (start.y + end.y) / 2 + routeVariation;
        let directPath = [start, { x: start.x, y: midY }, { x: end.x, y: midY }, end];

        if (!pathIntersectsObstacles(directPath, obstacles)) {
            pathPoints = directPath;
        } else {
            const detourX = (start.x + end.x) / 2 + detourOffset;
            pathPoints = [
                start,
                { x: start.x, y: start.y + 40 },
                { x: detourX, y: start.y + 40 },
                { x: detourX, y: end.y - 40 },
                { x: end.x, y: end.y - 40 },
                end
            ];
        }
    } else if (fromEdge === 'top' && toEdge === 'bottom') {
        const midY = (start.y + end.y) / 2 - routeVariation;
        let directPath = [start, { x: start.x, y: midY }, { x: end.x, y: midY }, end];

        if (!pathIntersectsObstacles(directPath, obstacles)) {
            pathPoints = directPath;
        } else {
            const detourX = (start.x + end.x) / 2 + detourOffset;
            pathPoints = [
                start,
                { x: start.x, y: start.y - 40 },
                { x: detourX, y: start.y - 40 },
                { x: detourX, y: end.y + 40 },
                { x: end.x, y: end.y + 40 },
                end
            ];
        }
    } else if (fromEdge === 'right' && toEdge === 'left') {
        const midX = (start.x + end.x) / 2 + routeVariation;
        let directPath = [start, { x: midX, y: start.y }, { x: midX, y: end.y }, end];

        if (!pathIntersectsObstacles(directPath, obstacles)) {
            pathPoints = directPath;
        } else {
            const horizontalDetourOffset = (detourOffset / 90) * 70;
            const detourY = (start.y + end.y) / 2 + horizontalDetourOffset;
            pathPoints = [
                start,
                { x: start.x + 40, y: start.y },
                { x: start.x + 40, y: detourY },
                { x: end.x - 40, y: detourY },
                { x: end.x - 40, y: end.y },
                end
            ];
        }
    } else if (fromEdge === 'left' && toEdge === 'right') {
        const midX = (start.x + end.x) / 2 - routeVariation;
        let directPath = [start, { x: midX, y: start.y }, { x: midX, y: end.y }, end];

        if (!pathIntersectsObstacles(directPath, obstacles)) {
            pathPoints = directPath;
        } else {
            const horizontalDetourOffset = (detourOffset / 90) * 70;
            const detourY = (start.y + end.y) / 2 + horizontalDetourOffset;
            pathPoints = [
                start,
                { x: start.x - 40, y: start.y },
                { x: start.x - 40, y: detourY },
                { x: end.x + 40, y: detourY },
                { x: end.x + 40, y: end.y },
                end
            ];
        }
    } else {
        const midX = (start.x + end.x) / 2;
        const midY = (start.y + end.y) / 2;

        if (fromEdge === 'bottom' || fromEdge === 'top') {
            pathPoints = [start, { x: start.x, y: midY }, { x: end.x, y: midY }, end];
        } else {
            pathPoints = [start, { x: midX, y: start.y }, { x: midX, y: end.y }, end];
        }
    }

    let pathSegments = [];
    for (let i = 0; i < pathPoints.length - 1; i++) {
        const p1 = pathPoints[i];
        const p2 = pathPoints[i + 1];

        const passesThroughComponent = obstacles.some(obs =>
            segmentPassesThroughComponent(p1.x, p1.y, p2.x, p2.y, obs)
        );

        pathSegments.push({
            x1: p1.x,
            y1: p1.y,
            x2: p2.x,
            y2: p2.y,
            dashed: passesThroughComponent
        });
    }

    return { pathPoints, pathSegments };
};

export const layoutDiagram = (architecture, systemName, { isMobile, isTablet }) => {
    const COMPONENT_WIDTH = isMobile ? 150 : (isTablet ? 180 : 220);
    const COMPONENT_HEIGHT = isMobile ? 90 : 120;
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
    const height = PADDING_TOP + (architecture.layers.length * LAYER_HEIGHT) + 40;

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
            y: PADDING_TOP + (layerIndex * LAYER_HEIGHT) + LAYER_LABEL_HEIGHT + (LAYER_HEIGHT - LAYER_LABEL_HEIGHT) / 2,
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
        const availableWidth = comp.width - (2 * EDGE_PADDING);
        const spacing = total > 1 ? availableWidth / (total - 1) : 0;
        const startX = comp.x - comp.width / 2 + EDGE_PADDING;
        const x = startX + (index * spacing);
        const y = edge === 'top' ? comp.y - comp.height / 2 : comp.y + comp.height / 2;
        return { x, y };
    } else {
        const availableHeight = comp.height - (2 * EDGE_PADDING);
        const spacing = total > 1 ? availableHeight / (total - 1) : 0;
        const startY = comp.y - comp.height / 2 + EDGE_PADDING;
        const y = startY + (index * spacing);
        const x = edge === 'left' ? comp.x - comp.width / 2 : comp.x + comp.width / 2;
        return { x, y };
    }
};

/**
 * Checks if a label overlaps with components, arrows, or other labels
 */
export const labelCollides = (x, y, pathPoints, components, placedLabels, width = 90, height = 26) => {
    const COMPONENT_BUFFER = 25;
    const ARROW_BUFFER = 40;
    const LABEL_BUFFER = 8;

    const labelBox = {
        left: x - width / 2,
        right: x + width / 2,
        top: y - height / 2,
        bottom: y + height / 2
    };

    // Check if label is too close to arrow endpoints
    if (pathPoints && pathPoints.length > 0) {
        const startPoint = pathPoints[0];
        const endPoint = pathPoints[pathPoints.length - 1];

        const distToStart = Math.sqrt(Math.pow(x - startPoint.x, 2) + Math.pow(y - startPoint.y, 2));
        const distToEnd = Math.sqrt(Math.pow(x - endPoint.x, 2) + Math.pow(y - endPoint.y, 2));

        if (distToStart < ARROW_BUFFER || distToEnd < ARROW_BUFFER) {
            return true;
        }
    }

    // Check collision with components
    for (const comp of components) {
        const compBox = {
            left: comp.x - comp.width / 2 - COMPONENT_BUFFER,
            right: comp.x + comp.width / 2 + COMPONENT_BUFFER,
            top: comp.y - comp.height / 2 - COMPONENT_BUFFER,
            bottom: comp.y + comp.height / 2 + COMPONENT_BUFFER
        };

        if (!(labelBox.right < compBox.left ||
            labelBox.left > compBox.right ||
            labelBox.bottom < compBox.top ||
            labelBox.top > compBox.bottom)) {
            return true;
        }
    }

    // Check collision with other labels
    for (const placed of placedLabels) {
        if (!(labelBox.right + LABEL_BUFFER < placed.left ||
            labelBox.left - LABEL_BUFFER > placed.right ||
            labelBox.bottom + LABEL_BUFFER < placed.top ||
            labelBox.top - LABEL_BUFFER > placed.bottom)) {
            return true;
        }
    }

    return false;
};

export const findBestLabelPosition = (pathPoints) => {
    if (pathPoints.length < 4) return { index: 1, length: 0 };

    let longestSegment = { index: 1, length: 0 };

    // Skip first and last segments (near arrows)
    for (let i = 1; i < pathPoints.length - 2; i++) {
        const p1 = pathPoints[i];
        const p2 = pathPoints[i + 1];
        const length = Math.sqrt(
            Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2)
        );

        if (length > longestSegment.length) {
            longestSegment = { index: i, length };
        }
    }

    return longestSegment;
};

export const findClearLabelPosition = (pathPoints, segmentIndex, components, placedLabels) => {
    const p1 = pathPoints[segmentIndex];
    const p2 = pathPoints[segmentIndex + 1];

    const midX = (p1.x + p2.x) / 2;
    const midY = (p1.y + p2.y) / 2;

    const isVertical = Math.abs(p1.x - p2.x) < 5;
    const isHorizontal = Math.abs(p1.y - p2.y) < 5;

    const positions = [];

    if (isHorizontal) {
        positions.push(
            { x: midX, y: midY - 35 },
            { x: midX, y: midY + 35 },
            { x: midX, y: midY - 50 },
            { x: midX, y: midY + 50 },
            { x: midX - 70, y: midY - 35 },
            { x: midX + 70, y: midY - 35 },
            { x: midX - 70, y: midY + 35 },
            { x: midX + 70, y: midY + 35 }
        );
    } else if (isVertical) {
        positions.push(
            { x: midX + 55, y: midY },
            { x: midX - 55, y: midY },
            { x: midX + 75, y: midY },
            { x: midX - 75, y: midY },
            { x: midX + 55, y: midY - 30 },
            { x: midX - 55, y: midY - 30 },
            { x: midX + 55, y: midY + 30 },
            { x: midX - 55, y: midY + 30 }
        );
    } else {
        const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
        const perpAngle = angle + Math.PI / 2;

        for (let dist of [40, 60, 80, 100]) {
            positions.push(
                {
                    x: midX + Math.cos(perpAngle) * dist,
                    y: midY + Math.sin(perpAngle) * dist
                },
                {
                    x: midX - Math.cos(perpAngle) * dist,
                    y: midY - Math.sin(perpAngle) * dist
                }
            );
        }
    }

    for (const pos of positions) {
        if (!labelCollides(pos.x, pos.y, pathPoints, components, placedLabels)) {
            return pos;
        }
    }

    // Extended fallback
    for (let offset = 70; offset <= 140; offset += 20) {
        const fallbackPositions = isVertical
            ? [{ x: midX + offset, y: midY }, { x: midX - offset, y: midY }]
            : [{ x: midX, y: midY - offset }, { x: midX, y: midY + offset }];

        for (const pos of fallbackPositions) {
            if (!labelCollides(pos.x, pos.y, pathPoints, components, placedLabels)) {
                return pos;
            }
        }
    }

    return positions[0];
};

export const segmentPassesThroughComponent = (x1, y1, x2, y2, comp) => {
    const PROXIMITY_THRESHOLD = 30; // If path is within 30px of component center

    const compBox = {
        left: comp.x - comp.width / 2,
        right: comp.x + comp.width / 2,
        top: comp.y - comp.height / 2,
        bottom: comp.y + comp.height / 2
    };

    // Check multiple points along segment
    for (let t = 0.2; t <= 0.8; t += 0.2) {
        const x = x1 + (x2 - x1) * t;
        const y = y1 + (y2 - y1) * t;

        if (x >= compBox.left - PROXIMITY_THRESHOLD &&
            x <= compBox.right + PROXIMITY_THRESHOLD &&
            y >= compBox.top - PROXIMITY_THRESHOLD &&
            y <= compBox.bottom + PROXIMITY_THRESHOLD) {
            return true;
        }
    }

    return false;
};

export const pathIntersectsObstacles = (points, obstacles) => {
    for (let i = 0; i < points.length - 1; i++) {
        for (let t = 0; t <= 1; t += 0.1) {
            const x = points[i].x + (points[i + 1].x - points[i].x) * t;
            const y = points[i].y + (points[i + 1].y - points[i].y) * t;

            for (const obs of obstacles) {
                if (x >= obs.left && x <= obs.right && y >= obs.top && y <= obs.bottom) {
                    return true;
                }
            }
        }
    }
    return false;
};
