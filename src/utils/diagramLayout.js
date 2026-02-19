import { getCloudIcon, getCloudBadge, normalizeServiceName } from './cloudIcons';

/**
 * Estimates label box dimensions from text content.
 * Uses approximate character width for SVG font-size 10, weight 700.
 * Returns { width, height } with padding included.
 */
export const measureLabelText = (text) => {
    if (!text) return { width: 50, height: 26 };
    const CHAR_WIDTH = 6.5;   // avg px per char at font-size 10, bold
    const H_PADDING = 18;     // 9px each side
    const MIN_WIDTH = 50;
    const MAX_WIDTH = 180;
    const height = 26;
    const width = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, text.length * CHAR_WIDTH + H_PADDING));
    return { width, height };
};


export const calculateConnectorPath = (
    start,
    end,
    fromEdge,
    toEdge,
    routeVariation = 0,
    detourOffset = 40,
    obstacles = [],
    startDim = { width: 0, height: 0 },
    endDim = { width: 0, height: 0 }
) => {
    // 1. Determine Margins (User requested increased turn distance)
    const MARGIN = 30;

    // Helper: Get point projected from edge
    const getProjectedPoint = (p, edge, dist) => {
        switch (edge) {
            case 'top': return { x: p.x, y: p.y - dist };
            case 'bottom': return { x: p.x, y: p.y + dist };
            case 'left': return { x: p.x - dist, y: p.y };
            case 'right': return { x: p.x + dist, y: p.y };
            default: return { ...p };
        }
    };

    const pStart = getProjectedPoint(start, fromEdge, MARGIN);
    const pEnd = getProjectedPoint(end, toEdge, MARGIN);

    let midPoints = [];

    // Orientation: Vertical (Top/Bottom) vs Horizontal (Left/Right)
    const isVert = (e) => e === 'top' || e === 'bottom';
    const startVert = isVert(fromEdge);
    const endVert = isVert(toEdge);

    // Routing Logic from pStart to pEnd
    if (startVert === endVert) {
        // Same Orientation (Vert-Vert or Horiz-Horiz)
        // Use Midpoint Logic
        if (startVert) {
            // Both Vertical: Use Mid Y
            // Apply variation + detour
            let midY = (pStart.y + pEnd.y) / 2;

            // Heuristic: If target is "behind" source (e.g. Bottom to Top but Top is below Bottom),
            // just standard midY works.
            // If direct alignment, apply variation.
            if (fromEdge === 'bottom' && toEdge === 'top') midY += routeVariation;
            else if (fromEdge === 'top' && toEdge === 'bottom') midY -= routeVariation;

            midPoints = [
                { x: pStart.x, y: midY },
                { x: pEnd.x, y: midY }
            ];
        } else {
            // Both Horizontal: Use Mid X
            let midX = (pStart.x + pEnd.x) / 2;
            if (fromEdge === 'right' && toEdge === 'left') midX += routeVariation;
            else if (fromEdge === 'left' && toEdge === 'right') midX -= routeVariation;

            midPoints = [
                { x: midX, y: pStart.y },
                { x: midX, y: pEnd.y }
            ];
        }
    } else {
        // Different Orientation (Corner)
        // Try simple 1-corner L-shape first
        // Intersection of (Start-Ray) and (End-Ray)
        // Start Vert -> x=Start, varies Y. End Horiz -> y=End, varies X. Intersection: (Start.x, End.y)
        // Start Horiz -> y=Start, varies X. End Vert -> x=End, varies Y. Intersection: (End.x, Start.y)

        const corner = startVert
            ? { x: pStart.x, y: pEnd.y } // Vert start, Horiz end
            : { x: pEnd.x, y: pStart.y }; // Horiz start, Vert end

        // Check if "Corner" is valid (not backwards)
        // "Backwards" means we have to go "in" towards the component to hit the corner.
        // pStart is already MARGIN away.
        // We need to check if moving from pStart to Corner is consistent with fromEdge direction?
        // Actually, pStart is already "out". Moving perpendicular to 'out' is always fine (it's parallel to edge).
        // The issue is if the Corner is "behind" the pStart in the 'out' direction?
        // No, pStart is defined. We move from pStart.
        // The issue is if Corner -> pEnd is backwards relative to pEnd's entry.

        // Let's just use the strict L-shape from pStart to pEnd.
        // It provides 2 intermediate points effectively (pStart, Corner, pEnd).
        // Total path: Start -> pStart -> Corner -> pEnd -> End.
        midPoints = [corner];
    }

    let pathPoints = [start, pStart, ...midPoints, pEnd, end];

    // Filter duplicates (if pStart == corner, etc)
    pathPoints = pathPoints.filter((p, i) => {
        if (i === 0) return true;
        const prev = pathPoints[i - 1];
        return Math.abs(p.x - prev.x) > 1 || Math.abs(p.y - prev.y) > 1;
    });

    // Handle "Detours" (Obstacles) - Rudimentary check
    // If direct path intersects, we might need the old Detour logic.
    // For now, the User's request is specific to "Clean Turns" and "Perpendicularity".
    // The previous detour logic was complex and conditional. 
    // We retain the "Direct Path" logic dominating.
    // If we want to restore detour, we'd need to check collisions on segments.
    // Given the strict request for perpendicularity, standard L/Z shapes are preferred over random detours.
    // We will stick to this clean routing.

    // 2. Adjust Start and End points (Legacy support if needed, but we used Projected points so we are good)
    // The previous code had specific logic for startDim/endDim.
    // If startDim > 0, calculateConnectorPath was shifting the start point.
    // But we are now using the PASSED 'start' and 'end' which are usually edge points.
    // If Dims are passed, usually 'start' is CENTER. 
    // BUT in CloudDiagramRenderer, 'start' is getDistributedPoint (EDGE).
    // So we assume Start/End are EDGE points.

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

/**
 * Checks if a label overlaps with components, arrows, or other labels.
 * width and height are the actual label dimensions (from measureLabelText).
 */
// Helper for box intersection
const boxesOverlap = (a, b) => {
    return !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom);
};

export const labelCollides = (x, y, pathPoints, components, placedLabels, width, height, groups = []) => {
    const COMPONENT_BUFFER = 20;
    const ARROW_BUFFER = 35;
    const LABEL_BUFFER = 15;
    const GROUP_BORDER_BUFFER = 15; // increased buffer for borders

    const hw = width / 2;
    const hh = height / 2;

    const labelBox = {
        left: x - hw,
        right: x + hw,
        top: y - hh,
        bottom: y + hh
    };

    // Check if label is too close to arrow endpoints
    if (pathPoints && pathPoints.length > 0) {
        const startPoint = pathPoints[0];
        const endPoint = pathPoints[pathPoints.length - 1];

        const distToStart = Math.sqrt((x - startPoint.x) ** 2 + (y - startPoint.y) ** 2);
        const distToEnd = Math.sqrt((x - endPoint.x) ** 2 + (y - endPoint.y) ** 2);

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

        if (boxesOverlap(labelBox, compBox)) return true;
    }

    // Check collision with other placed labels
    for (const placed of placedLabels) {
        const placedWithBuffer = {
            left: placed.left - LABEL_BUFFER,
            right: placed.right + LABEL_BUFFER,
            top: placed.top - LABEL_BUFFER,
            bottom: placed.bottom + LABEL_BUFFER
        };

        if (boxesOverlap(labelBox, placedWithBuffer)) return true;
    }

    // Check collision with Group Borders and Labels
    if (groups && groups.length > 0) {
        for (const group of groups) {
            // 1. Group Label Collision (Top-Left corner)
            // Estimated text width + icon space.
            const labelWidthEstimate = (group.name?.length || 10) * 8 + 40;
            const groupLabelBox = {
                left: group.x, // padding handled in render
                right: group.x + labelWidthEstimate,
                top: group.y,
                bottom: group.y + 35 // header height
            };
            if (boxesOverlap(labelBox, groupLabelBox)) return true;

            // 2. Group Border Collisions
            // We want to prevent the label from sitting directly ON the border line.
            // We detect this by checking overlaps with 4 "rectangles" representing the borders.

            // Top Border
            if (boxesOverlap(labelBox, {
                left: group.x - GROUP_BORDER_BUFFER,
                right: group.x + group.width + GROUP_BORDER_BUFFER,
                top: group.y - GROUP_BORDER_BUFFER,
                bottom: group.y + GROUP_BORDER_BUFFER
            })) return true;

            // Bottom Border
            if (boxesOverlap(labelBox, {
                left: group.x - GROUP_BORDER_BUFFER,
                right: group.x + group.width + GROUP_BORDER_BUFFER,
                top: group.y + group.height - GROUP_BORDER_BUFFER,
                bottom: group.y + group.height + GROUP_BORDER_BUFFER
            })) return true;

            // Left Border
            if (boxesOverlap(labelBox, {
                left: group.x - GROUP_BORDER_BUFFER,
                right: group.x + GROUP_BORDER_BUFFER,
                top: group.y - GROUP_BORDER_BUFFER,
                bottom: group.y + group.height + GROUP_BORDER_BUFFER
            })) return true;

            // Right Border
            if (boxesOverlap(labelBox, {
                left: group.x + group.width - GROUP_BORDER_BUFFER,
                right: group.x + group.width + GROUP_BORDER_BUFFER,
                top: group.y - GROUP_BORDER_BUFFER,
                bottom: group.y + group.height + GROUP_BORDER_BUFFER
            })) return true;
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

/**
 * Finds a collision-free position for a label along a connector path.
 * Strategy (in priority order):
 *   1. Sample at 25-75% along each internal segment with perpendicular offsets
 *   2. Try all four cardinal directions at increasing distances
 *   3. Grid-search a rectangular region around every segment midpoint
 *   4. Absolute fallback: push label far away from the nearest component
 *
 * @param {Array} pathPoints - the connector path points
 * @param {number} segmentIndex - preferred segment (longest)
 * @param {Array} components - all diagram components
 * @param {Array} placedLabels - already placed label boxes
 * @param {number} labelWidth - actual label width from measureLabelText
 * @param {number} labelHeight - actual label height from measureLabelText
 */
export const findClearLabelPosition = (pathPoints, segmentIndex, components, placedLabels, labelWidth = 90, labelHeight = 26, groups = []) => {
    const hw = labelWidth / 2;
    const hh = labelHeight / 2;

    // Helper: check a position and return it if clear
    const tryPos = (x, y) =>
        !labelCollides(x, y, pathPoints, components, placedLabels, labelWidth, labelHeight, groups)
            ? { x, y }
            : null;

    // ── Phase 1: Perpendicular + along-path offsets on each segment ──────
    const getCandidates = (p1, p2) => {
        const candidates = [];
        const isVertical = Math.abs(p1.x - p2.x) < 5;
        const isHorizontal = Math.abs(p1.y - p2.y) < 5;
        const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
        const perpAngle = angle + Math.PI / 2;

        for (const t of [0.5, 0.35, 0.65, 0.25, 0.75]) {
            const mx = p1.x + (p2.x - p1.x) * t;
            const my = p1.y + (p2.y - p1.y) * t;

            if (isHorizontal) {
                for (const dy of [-30, 30, -48, 48, -18, -65, 65]) {
                    candidates.push({ x: mx, y: my + dy });
                }
            } else if (isVertical) {
                for (const dx of [hw + 12, -(hw + 12), hw + 30, -(hw + 30), hw + 50, -(hw + 50)]) {
                    candidates.push({ x: mx + dx, y: my });
                }
            } else {
                // Diagonal segments: perpendicular offsets at varied distances
                for (const dist of [32, 50, 70, 95]) {
                    candidates.push(
                        { x: mx + Math.cos(perpAngle) * dist, y: my + Math.sin(perpAngle) * dist },
                        { x: mx - Math.cos(perpAngle) * dist, y: my - Math.sin(perpAngle) * dist }
                    );
                }
                // Also try pure cardinal offsets from diagonal midpoints
                for (const d of [40, 65]) {
                    candidates.push(
                        { x: mx, y: my - d },
                        { x: mx, y: my + d },
                        { x: mx - d, y: my },
                        { x: mx + d, y: my }
                    );
                }
            }
        }
        return candidates;
    };

    // Build ordered list of segments: preferred first, then others
    const segmentOrder = [segmentIndex];
    for (let i = 1; i < pathPoints.length - 1; i++) {
        if (i !== segmentIndex) segmentOrder.push(i);
    }

    for (const si of segmentOrder) {
        if (si < 0 || si + 1 >= pathPoints.length) continue;
        const candidates = getCandidates(pathPoints[si], pathPoints[si + 1]);
        for (const pos of candidates) {
            const hit = tryPos(pos.x, pos.y);
            if (hit) return hit;
        }
    }

    // ── Phase 2: Four-direction sweep at larger distances ────────────────
    const p1 = pathPoints[segmentIndex];
    const p2 = pathPoints[segmentIndex + 1];
    const mx = (p1.x + p2.x) / 2;
    const my = (p1.y + p2.y) / 2;

    for (let offset = 80; offset <= 200; offset += 20) {
        for (const pos of [
            { x: mx, y: my - offset },
            { x: mx, y: my + offset },
            { x: mx + offset, y: my },
            { x: mx - offset, y: my },
            { x: mx + offset * 0.7, y: my - offset * 0.7 },
            { x: mx - offset * 0.7, y: my + offset * 0.7 }
        ]) {
            const hit = tryPos(pos.x, pos.y);
            if (hit) return hit;
        }
    }

    // ── Phase 3: Grid search around every segment midpoint ───────────────
    for (const si of segmentOrder) {
        if (si < 0 || si + 1 >= pathPoints.length) continue;
        const sp1 = pathPoints[si];
        const sp2 = pathPoints[si + 1];
        const gmx = (sp1.x + sp2.x) / 2;
        const gmy = (sp1.y + sp2.y) / 2;

        for (let dx = -120; dx <= 120; dx += 40) {
            for (let dy = -120; dy <= 120; dy += 30) {
                if (dx === 0 && dy === 0) continue;
                const hit = tryPos(gmx + dx, gmy + dy);
                if (hit) return hit;
            }
        }
    }

    // ── Phase 4: Guaranteed-safe absolute fallback ───────────────────────
    // Push label far enough from all components that it cannot collide.
    let bestX = mx;
    let bestY = my - 60;
    let bestMinDist = 0;
    for (const dir of [
        { dx: 0, dy: -1 }, { dx: 0, dy: 1 },
        { dx: 1, dy: 0 }, { dx: -1, dy: 0 }
    ]) {
        for (let step = 100; step <= 250; step += 30) {
            const cx = mx + dir.dx * step;
            const cy = my + dir.dy * step;

            // Collision check with already placed labels (strict avoidance in fallback)
            let collidesWithLabel = false;
            const currentLabelBox = {
                left: cx - hw,
                right: cx + hw,
                top: cy - hh,
                bottom: cy + hh
            };

            for (const placed of placedLabels) {
                // Use 15px buffer here too
                if (boxesOverlap(currentLabelBox, {
                    left: placed.left - 15,
                    right: placed.right + 15,
                    top: placed.top - 15,
                    bottom: placed.bottom + 15
                })) {
                    collidesWithLabel = true;
                    break;
                }
            }

            if (collidesWithLabel) continue;

            // Strict component collision check
            let collidesWithComponent = false;
            for (const comp of components) {
                const compBox = {
                    left: comp.x - comp.width / 2 - 10,
                    right: comp.x + comp.width / 2 + 10,
                    top: comp.y - comp.height / 2 - 10,
                    bottom: comp.y + comp.height / 2 + 10
                };
                if (boxesOverlap(currentLabelBox, compBox)) {
                    collidesWithComponent = true;
                    break;
                }
            }
            if (collidesWithComponent) continue;

            let minCompDist = Infinity;
            for (const comp of components) {
                const d = Math.sqrt((cx - comp.x) ** 2 + (cy - comp.y) ** 2);
                minCompDist = Math.min(minCompDist, d);
            }
            if (minCompDist > bestMinDist) {
                bestMinDist = minCompDist;
                bestX = cx;
                bestY = cy;
            }
        }
    }
    return { x: bestX, y: bestY };
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

/**
 * Clips line segments to exclude portions that fall within any label bounding box.
 * Each label bound is { left, right, top, bottom }.
 * Returns new array of segments with the same properties (dashed, etc.)
 * but with portions inside labels removed.
 *
 * @param {Array<{x1,y1,x2,y2,dashed:boolean}>} segments
 * @param {Array<{left,right,top,bottom}>} labelBounds - all label bounding rects
 * @returns {Array<{x1,y1,x2,y2,dashed:boolean}>}
 */
export const clipSegmentsAroundLabels = (segments, labelBounds) => {
    if (!labelBounds || labelBounds.length === 0) return segments;

    const PAD = 4; // extra padding so line stops a few px before label edge

    const result = [];

    for (const seg of segments) {
        // Start with the full segment as a list of sub-segments to process
        let pieces = [{ ...seg }];

        for (const lb of labelBounds) {
            const padded = {
                left: lb.left - PAD,
                right: lb.right + PAD,
                top: lb.top - PAD,
                bottom: lb.bottom + PAD
            };

            const nextPieces = [];

            for (const piece of pieces) {
                const clipped = clipOneSeg(piece, padded);
                nextPieces.push(...clipped);
            }

            pieces = nextPieces;
        }

        result.push(...pieces);
    }

    return result;
};

/**
 * Clips a single line segment against a rect.
 * Returns array of 0-2 sub-segments that are OUTSIDE the rect.
 */
function clipOneSeg(seg, rect) {
    const { x1, y1, x2, y2, dashed } = seg;

    // Parametric: P(t) = (x1 + t*(x2-x1), y1 + t*(y2-y1)), t in [0,1]
    const dx = x2 - x1;
    const dy = y2 - y1;

    // Find t-range where segment is inside the rect using Cohen-Sutherland style
    let tEnter = 0;
    let tExit = 1;

    const edges = [
        { p: -dx, q: x1 - rect.left },   // left
        { p: dx, q: rect.right - x1 },   // right
        { p: -dy, q: y1 - rect.top },     // top
        { p: dy, q: rect.bottom - y1 }   // bottom
    ];

    for (const { p, q } of edges) {
        if (Math.abs(p) < 0.001) {
            // Parallel to this edge
            if (q < 0) {
                // Entirely outside this edge → segment is fully outside
                return [seg];
            }
            continue;
        }
        const t = q / p;
        if (p < 0) {
            // Entering
            if (t > tEnter) tEnter = t;
        } else {
            // Exiting
            if (t < tExit) tExit = t;
        }
    }

    if (tEnter >= tExit) {
        // No intersection — segment is entirely outside
        return [seg];
    }

    // The segment intersects the rect from t=tEnter to t=tExit
    const results = [];

    // Part before the rect
    if (tEnter > 0.01) {
        results.push({
            x1: x1,
            y1: y1,
            x2: x1 + tEnter * dx,
            y2: y1 + tEnter * dy,
            dashed
        });
    }

    // Part after the rect
    if (tExit < 0.99) {
        results.push({
            x1: x1 + tExit * dx,
            y1: y1 + tExit * dy,
            x2: x2,
            y2: y2,
            dashed
        });
    }

    return results;
}

export const layoutCloudDiagram = (architecture, systemName, { isMobile, isTablet }) => {
    const COMP_WIDTH = 180;
    const COMP_HEIGHT = 180;   // taller to fit icon + label + service + techs
    const GAP = 80;
    const GROUP_PADDING = 80;  // space for group label + border
    const TITLE_SPACE = 60;

    // 1. Build group tree
    // Initialize map with all groups
    const groupMap = new Map();
    if (architecture.groups) {
        architecture.groups.forEach(g => {
            groupMap.set(g.id, { ...g, children: [], bounds: null });
        });
    }

    const rootGroups = [];
    const orphanComponentIds = new Set(architecture.components.map(c => c.id));

    // Build tree structure
    groupMap.forEach(group => {
        if (group.parentGroupId && groupMap.has(group.parentGroupId)) {
            groupMap.get(group.parentGroupId).children.push(group);
        } else {
            rootGroups.push(group);
        }
        // Mark components in this group as not orphans
        if (group.componentIds) {
            group.componentIds.forEach(id => orphanComponentIds.delete(id));
        }
    });

    // Helper to sort groups recursively based on priority terms
    const sortGroupsRecursively = (groups) => {
        if (!groups || groups.length === 0) return;

        const priorityTerms = ['user', 'client', 'external', 'presentation'];
        groups.sort((a, b) => {
            const aName = (a.name || '').toLowerCase();
            const bName = (b.name || '').toLowerCase();
            const aType = (a.groupType || '').toLowerCase();
            const bType = (b.groupType || '').toLowerCase();

            const aPriority = priorityTerms.some(term => aName.includes(term) || aType.includes(term));
            const bPriority = priorityTerms.some(term => bName.includes(term) || bType.includes(term));

            if (aPriority && !bPriority) return -1;
            if (!aPriority && bPriority) return 1;
            return 0; // Keep original order if possible
        });

        // Recurse into children
        groups.forEach(g => {
            if (g.children && g.children.length > 0) {
                sortGroupsRecursively(g.children);
            }
        });
    };

    // Apply recursive sorting starting from root
    sortGroupsRecursively(rootGroups);

    // 1b. Fix Orphan Detection: Check components that declare membership via groupId
    // (This fixes the issue where components with valid groupId were incorrectly flagged as orphans)
    architecture.components.forEach(c => {
        if (c.groupId && groupMap.has(c.groupId)) {
            orphanComponentIds.delete(c.id);
        }
    });

    // 2. Recursively calculate bounds and positions
    const positionedComponents = new Map();
    const positionedGroups = [];

    const layoutGroup = (group, startX, startY) => {
        let curX = startX + GROUP_PADDING;
        let curY = startY + GROUP_PADDING + 20; // +20 for label
        let maxRowHeight = 0;
        let maxWidth = 0;

        // Layout direct components in this group
        const directComps = architecture.components.filter(c => c.groupId === group.id || (group.componentIds && group.componentIds.includes(c.id)));

        // Remove from orphan set
        directComps.forEach(c => orphanComponentIds.delete(c.id));

        // Group components by Tier for vertical stacking
        const tiers = {
            top: [],    // user, frontend, external
            middle: [], // api, service, queue, compute
            bottom: []  // database, cache, storage
        };

        directComps.forEach(comp => {
            const type = comp.type?.toLowerCase() || 'service';
            if (['user', 'frontend', 'external', 'client'].includes(type) || comp.name.toLowerCase().includes('client') || comp.name.toLowerCase().includes('frontend')) {
                tiers.top.push(comp);
            } else if (['database', 'cache', 'storage', 'db'].includes(type) || comp.name.toLowerCase().includes('db') || comp.name.toLowerCase().includes('database') || comp.name.toLowerCase().includes('s3') || comp.name.toLowerCase().includes('bucket')) {
                tiers.bottom.push(comp);
            } else {
                tiers.middle.push(comp);
            }
        });

        // Layout Tiers Vertically
        ['top', 'middle', 'bottom'].forEach(tierName => {
            const tierComps = tiers[tierName];
            if (tierComps.length === 0) return;

            // Sort tier components by connection topology (simple heuristic)
            tierComps.sort((a, b) => a.name.localeCompare(b.name));

            // Grid Layout Constants
            const MAX_COLS = 4;
            let currentTierHeight = 0;
            let currentTierWidth = 0;

            tierComps.forEach((comp, i) => {
                const normalizedService = comp.cloudService ? normalizeServiceName(comp.cloudService) : '';
                const cloudIconUrl = comp.cloudProvider ? getCloudIcon(comp.cloudProvider, normalizedService) : null;

                const col = i % MAX_COLS;
                const row = Math.floor(i / MAX_COLS);

                const compX = startX + GROUP_PADDING + col * (COMP_WIDTH + GAP);
                const compY = curY + row * (COMP_HEIGHT + GAP);

                positionedComponents.set(comp.id, {
                    ...comp,
                    x: compX + COMP_WIDTH / 2,
                    y: compY + COMP_HEIGHT / 2,
                    width: COMP_WIDTH,
                    height: COMP_HEIGHT,
                    cloudIconUrl,
                    normalizedService,
                    cloudProvider: comp.cloudProvider || architecture.cloudProvider
                });

                currentTierWidth = Math.max(currentTierWidth, (col + 1) * (COMP_WIDTH + GAP));
                currentTierHeight = (row + 1) * (COMP_HEIGHT + GAP);
            });

            // Update group dimensions based on this tier
            maxWidth = Math.max(maxWidth, currentTierWidth);

            // Move Y down for next tier
            curY += currentTierHeight; // GAP is already included in row height calculation
            maxRowHeight += currentTierHeight;
        });

        // Layout child groups VERTICALLY (with conditional horizontal for small siblings)
        if (group.children && group.children.length > 0) {
            let childGroupsX = startX + GROUP_PADDING;
            let i = 0;

            const getCompCount = (g) => architecture.components.filter(c => c.groupId === g.id || (g.componentIds && g.componentIds.includes(c.id))).length;

            while (i < group.children.length) {
                const current = group.children[i];
                const next = group.children[i + 1];

                const countCurrent = getCompCount(current);
                const countNext = next ? getCompCount(next) : 999;

                if ((countCurrent + countNext) <= 4) {
                    // Place side-by-side
                    const b1 = layoutGroup(current, childGroupsX, curY);
                    const b2 = layoutGroup(next, childGroupsX + b1.width + GAP, curY);

                    // Row height is max of both
                    const rowHeight = Math.max(b1.height, b2.height);

                    // Row width is sum of both + gap
                    const rowWidth = b1.width + GAP + b2.width;

                    curY += rowHeight + GAP;

                    // Update maxWidth relative to parent group start
                    // childGroupsX - startX = GROUP_PADDING
                    maxWidth = Math.max(maxWidth, rowWidth + GROUP_PADDING);

                    i += 2;
                } else {
                    // Standard vertical
                    const b = layoutGroup(current, childGroupsX, curY);
                    curY += b.height + GAP;
                    maxWidth = Math.max(maxWidth, b.width + GROUP_PADDING);
                    i++;
                }
            }
        }

        const myWidth = Math.max(maxWidth, 200) + GROUP_PADDING;

        // Final bounds calculation
        const bounds = {
            x: startX,
            y: startY,
            width: myWidth,
            height: (curY - startY) + GROUP_PADDING / 2
        };

        positionedGroups.push({ ...group, ...bounds });
        return bounds;
    };

    let x = 60; // Increased from 20 to prevents left-side label cutoff
    let totalHeight = TITLE_SPACE;

    // Layout orphaned components first (if any)
    const orphans = Array.from(orphanComponentIds).map(id => architecture.components.find(c => c.id === id)).filter(Boolean);
    if (orphans.length > 0) {
        // Wrap them in a "Default" group? Or just place them?
        // Let's place them in a row at top?
        // Or create a dummy group.
        const dummyGroup = {
            id: 'orphans',
            name: 'Ungrouped Resources',
            groupType: 'region', // styling fallback
            children: [],
            componentIds: orphans.map(c => c.id)
        };
        // Add to root groups
        rootGroups.unshift(dummyGroup);
    }

    rootGroups.forEach(group => {
        const bounds = layoutGroup(group, x, TITLE_SPACE);
        x += bounds.width + GAP;
        totalHeight = Math.max(totalHeight, bounds.height + TITLE_SPACE + 40);
    });

    const EXTRA_PADDING = 200; // Extra space for connectors/labels that might detour outside groups

    // Filter out empty groups (no components AND no children)
    const finalGroups = positionedGroups.filter(g => {
        // A group is empty if:
        // 1. It has no components assigned to it (via groupId or componentIds)
        // 2. AND it has no children groups

        const hasComponents = architecture.components.some(c => c.groupId === g.id || (g.componentIds && g.componentIds.includes(c.id)));
        const hasChildren = g.children && g.children.length > 0;

        return hasComponents || hasChildren;
    });

    return {
        systemName,
        width: Math.max(x + 20 + EXTRA_PADDING, 1200),
        height: totalHeight + EXTRA_PADDING,
        components: Array.from(positionedComponents.values()),
        connections: architecture.connections,
        groups: finalGroups,
        cloudProvider: architecture.cloudProvider,
        isCloudMode: true
    };
};
