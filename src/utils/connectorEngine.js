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
    // We will build `pathPoints` directly taking into account the directions and component bounding boxes.
    let pathPoints = [start, pStart];

    const getCompBox = (dim) => {
        if (!dim || !dim.width || !dim.height) return null;
        return {
            left: dim.x - dim.width / 2,
            right: dim.x + dim.width / 2,
            top: dim.y - dim.height / 2,
            bottom: dim.y + dim.height / 2
        };
    };

    const startBox = getCompBox(startDim);
    const endBox = getCompBox(endDim);

    const isInsideBox = (pt, box) => {
        if (!box) return false;
        // Check with a tiny margin so touching the edge doesn't count as inside
        return pt.x > box.left + 1 && pt.x < box.right - 1 && pt.y > box.top + 1 && pt.y < box.bottom - 1;
    };

    const segmentIntersectsBox = (p1, p2, box) => {
        if (!box) return false;
        // Quick AABB check first
        const minX = Math.min(p1.x, p2.x);
        const maxX = Math.max(p1.x, p2.x);
        const minY = Math.min(p1.y, p2.y);
        const maxY = Math.max(p1.y, p2.y);

        if (maxX < box.left || minX > box.right || maxY < box.top || minY > box.bottom) {
            return false;
        }

        // If it's a vertical or horizontal segment the AABB check is exact
        if (p1.x === p2.x) { // Vertical
            return p1.x > box.left && p1.x < box.right;
        }
        if (p1.y === p2.y) { // Horizontal
            return p1.y > box.top && p1.y < box.bottom;
        }

        // For diagonal segments (not expected here, but for completeness)
        return true;
    };

    if (startVert === endVert) {
        // Same Orientation (Vert-Vert or Horiz-Horiz)
        if (startVert) {
            let midY = (pStart.y + pEnd.y) / 2;
            if (fromEdge === 'bottom' && toEdge === 'top') midY += routeVariation;
            else if (fromEdge === 'top' && toEdge === 'bottom') midY -= routeVariation;

            // Check if traversing along midY to pEnd.x hits the start or end boxes
            const p1 = { x: pStart.x, y: midY };
            const p2 = { x: pEnd.x, y: midY };

            // If we're routing "backwards" (e.g., from top, but going down)
            if (segmentIntersectsBox(pStart, p1, startBox) || segmentIntersectsBox(p1, p2, startBox)) {
                // Route around the start box (left or right)
                const routeSideX = pEnd.x > pStart.x ? startBox.right + MARGIN : startBox.left - MARGIN;
                pathPoints.push({ x: routeSideX, y: pStart.y });
                pathPoints.push({ x: routeSideX, y: midY });
                pathPoints.push({ x: pEnd.x, y: midY });
            } else if (segmentIntersectsBox(p1, p2, endBox) || segmentIntersectsBox(p2, pEnd, endBox)) {
                // Route around the end box
                const routeSideX = pStart.x > pEnd.x ? endBox.right + MARGIN : endBox.left - MARGIN;
                pathPoints.push({ x: pStart.x, y: midY });
                pathPoints.push({ x: routeSideX, y: midY });
                pathPoints.push({ x: routeSideX, y: pEnd.y });
            } else {
                pathPoints.push(p1, p2);
            }
        } else {
            let midX = (pStart.x + pEnd.x) / 2;
            if (fromEdge === 'right' && toEdge === 'left') midX += routeVariation;
            else if (fromEdge === 'left' && toEdge === 'right') midX -= routeVariation;

            const p1 = { x: midX, y: pStart.y };
            const p2 = { x: midX, y: pEnd.y };

            if (segmentIntersectsBox(pStart, p1, startBox) || segmentIntersectsBox(p1, p2, startBox)) {
                // Route around start box (top or bottom)
                const routeSideY = pEnd.y > pStart.y ? startBox.bottom + MARGIN : startBox.top - MARGIN;
                pathPoints.push({ x: pStart.x, y: routeSideY });
                pathPoints.push({ x: midX, y: routeSideY });
                pathPoints.push({ x: midX, y: pEnd.y });
            } else if (segmentIntersectsBox(p1, p2, endBox) || segmentIntersectsBox(p2, pEnd, endBox)) {
                // Route around end box
                const routeSideY = pStart.y > pEnd.y ? endBox.bottom + MARGIN : endBox.top - MARGIN;
                pathPoints.push({ x: midX, y: pStart.y });
                pathPoints.push({ x: midX, y: routeSideY });
                pathPoints.push({ x: pEnd.x, y: routeSideY });
            } else {
                pathPoints.push(p1, p2);
            }
        }
    } else {
        // Different Orientation (Corner)
        const corner1 = startVert ? { x: pStart.x, y: pEnd.y } : { x: pEnd.x, y: pStart.y };

        // Single corner routing check
        let isValidSimpleCorner = !segmentIntersectsBox(pStart, corner1, startBox) &&
            !segmentIntersectsBox(corner1, pEnd, startBox) &&
            !segmentIntersectsBox(pStart, corner1, endBox) &&
            !segmentIntersectsBox(corner1, pEnd, endBox);

        if (isValidSimpleCorner) {
            pathPoints.push(corner1);
        } else {
            // Need a U-shape route (two corners) to avoid intersection
            if (startVert) {
                // Moving vertically out of start, then horizontally to end
                const midY = (pStart.y + (fromEdge === 'top' ? startBox.top - MARGIN : startBox.bottom + MARGIN)) / 2;
                const midX = pEnd.x > pStart.x ? startBox.right + MARGIN : startBox.left - MARGIN;

                if (!segmentIntersectsBox(pStart, { x: pStart.x, y: midY }, startBox)) {
                    // It's safe to just use a mid-route if the standard corner is penetrating the end box
                    const rY = pStart.y;
                    const rX = toEdge === 'left' ? endBox.left - MARGIN : endBox.right + MARGIN;
                    pathPoints.push({ x: pStart.x, y: pStart.y }); // Out from start
                    pathPoints.push({ x: rX, y: pStart.y }); // Across to end column
                    pathPoints.push({ x: rX, y: pEnd.y }); // Down to end row
                } else {
                    const routeY = fromEdge === 'top' ? startBox.top - MARGIN : startBox.bottom + MARGIN;
                    const routeX = pEnd.x > pStart.x ? startBox.right + MARGIN : startBox.left - MARGIN;
                    pathPoints.push({ x: pStart.x, y: routeY });
                    pathPoints.push({ x: routeX, y: routeY });
                    pathPoints.push({ x: routeX, y: pEnd.y });
                }
            } else {
                // Moving horizontally out of start, then vertically to end
                const routeX = fromEdge === 'left' ? startBox.left - MARGIN : startBox.right + MARGIN;
                const routeY = pEnd.y > pStart.y ? startBox.bottom + MARGIN : startBox.top - MARGIN;

                // Alternate route logic based on box intersection
                if (!segmentIntersectsBox(pStart, { x: routeX, y: pStart.y }, startBox)) {
                    const rX = pStart.x;
                    const rY = toEdge === 'top' ? endBox.top - MARGIN : endBox.bottom + MARGIN;
                    pathPoints.push({ x: pStart.x, y: pStart.y });
                    pathPoints.push({ x: pStart.x, y: rY });
                    pathPoints.push({ x: pEnd.x, y: rY });
                } else {
                    pathPoints.push({ x: routeX, y: pStart.y });
                    pathPoints.push({ x: routeX, y: routeY });
                    pathPoints.push({ x: pEnd.x, y: routeY });
                }
            }
        }
    }

    pathPoints.push(pEnd, end);

    // Filter duplicates
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
