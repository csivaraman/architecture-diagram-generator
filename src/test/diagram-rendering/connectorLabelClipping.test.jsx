
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import {
    getDistributedPoint,
    redistributeOvercrowdedEdges,
    getConnectorColor,
    layoutDiagram
} from '../../utils/diagramLayout';
import {
    calculateConnectorPath,
    findBestLabelPosition,
    findClearLabelPosition,
    measureLabelText,
    clipSegmentsAroundLabels
} from '../../utils/connectorEngine';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CACHE_DIR = join(__dirname, '../cache/api-responses');

/**
 * Load one cached API response JSON file and extract the diagram.
 */
function loadCachedDiagram(filename) {
    const raw = readFileSync(join(CACHE_DIR, filename), 'utf-8');
    const data = JSON.parse(raw);
    return data.response?.diagram || null;
}

/**
 * Pick one representative cached JSON for a given provider+cloud combination.
 */
function pickCachedFile(provider, cloud) {
    const prefix = `${provider}_${cloud}_`;
    const files = readdirSync(CACHE_DIR).filter(f => f.startsWith(prefix) && f.endsWith('.json'));
    if (files.length === 0) return null;
    // Pick largest file (most connections → best test case)
    files.sort((a, b) => {
        const sa = readFileSync(join(CACHE_DIR, a)).length;
        const sb = readFileSync(join(CACHE_DIR, b)).length;
        return sb - sa;
    });
    return files[0];
}

/**
 * Given a raw diagram (just components + connections + layers, no x/y),
 * apply layoutDiagram to get positioned components, then compute all
 * connection data (paths, labels, clipped segments).
 *
 * Returns { connectionData, allLabelBounds } for assertions.
 */
function computeConnectionLayout(rawDiagram) {
    const diagram = layoutDiagram(rawDiagram, rawDiagram.systemName || 'Test System', {
        isMobile: false,
        isTablet: false
    });

    // Pre-calculate connection point distribution (same logic as App.jsx)
    const connectionPoints = new Map();
    diagram.components.forEach(comp => {
        connectionPoints.set(comp.id, { top: [], bottom: [], left: [], right: [] });
    });

    diagram.connections.forEach((conn, idx) => {
        const fromComp = diagram.components.find(c => c.id === conn.from);
        const toComp = diagram.components.find(c => c.id === conn.to);
        if (!fromComp || !toComp) return;

        const dx = toComp.x - fromComp.x;
        const dy = toComp.y - fromComp.y;
        let fromEdge, toEdge;

        if (Math.abs(dy) > Math.abs(dx)) {
            fromEdge = dy > 0 ? 'bottom' : 'top';
            toEdge = dy > 0 ? 'top' : 'bottom';
        } else {
            fromEdge = dx > 0 ? 'right' : 'left';
            toEdge = dx > 0 ? 'left' : 'right';
        }

        connectionPoints.get(fromComp.id)[fromEdge].push({ connIdx: idx, direction: 'out', toCompId: toComp.id });
        connectionPoints.get(toComp.id)[toEdge].push({ connIdx: idx, direction: 'in', fromCompId: fromComp.id });
    });

    redistributeOvercrowdedEdges(diagram.components, connectionPoints);

    const placedLabels = [];
    const connectionData = [];

    diagram.connections.forEach((conn, idx) => {
        const fromComp = diagram.components.find(c => c.id === conn.from);
        const toComp = diagram.components.find(c => c.id === conn.to);
        if (!fromComp || !toComp) return;

        const dx = toComp.x - fromComp.x;
        const dy = toComp.y - fromComp.y;
        let fromEdge, toEdge;

        if (Math.abs(dy) > Math.abs(dx)) {
            fromEdge = dy > 0 ? 'bottom' : 'top';
            toEdge = dy > 0 ? 'top' : 'bottom';
        } else {
            fromEdge = dx > 0 ? 'right' : 'left';
            toEdge = dx > 0 ? 'left' : 'right';
        }

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

        connectionData.push({
            idx, conn, pathSegments, labelPos, labelDims, labelBound, hw, hh
        });
    });

    const allLabelBounds = connectionData.map(cd => cd.labelBound);

    connectionData.forEach(cd => {
        cd.clippedSegments = clipSegmentsAroundLabels(cd.pathSegments, allLabelBounds);
    });

    return { connectionData, allLabelBounds, diagram };
}

/**
 * Checks whether a line segment intersects (passes through) a label rect.
 * Uses the same parametric approach as clipOneSeg.
 */
function segmentIntersectsLabel(seg, label, pad = 2) {
    const rect = {
        left: label.left - pad,
        right: label.right + pad,
        top: label.top - pad,
        bottom: label.bottom + pad
    };

    const dx = seg.x2 - seg.x1;
    const dy = seg.y2 - seg.y1;
    let tEnter = 0, tExit = 1;

    const edges = [
        { p: -dx, q: seg.x1 - rect.left },
        { p: dx, q: rect.right - seg.x1 },
        { p: -dy, q: seg.y1 - rect.top },
        { p: dy, q: rect.bottom - seg.y1 }
    ];

    for (const { p, q } of edges) {
        if (Math.abs(p) < 0.001) {
            if (q < 0) return false;
            continue;
        }
        const t = q / p;
        if (p < 0) {
            if (t > tEnter) tEnter = t;
        } else {
            if (t < tExit) tExit = t;
        }
    }

    // Consider it an intersection only if the overlap is meaningful (> 5px of travel)
    if (tEnter >= tExit) return false;
    const segLen = Math.hypot(dx, dy);
    const overlapLen = (tExit - tEnter) * segLen;
    return overlapLen > 5;
}

// ─── Unit Tests: clipSegmentsAroundLabels function ───────────────────────────

describe('clipSegmentsAroundLabels – unit tests', () => {

    it('should return segments unchanged when no labels exist', () => {
        const segs = [{ x1: 0, y1: 0, x2: 100, y2: 0, dashed: false }];
        const result = clipSegmentsAroundLabels(segs, []);
        expect(result).toEqual(segs);
    });

    it('should return segments unchanged when label does not intersect', () => {
        const segs = [{ x1: 0, y1: 0, x2: 100, y2: 0, dashed: false }];
        const labels = [{ left: 200, right: 300, top: -20, bottom: 20 }];
        const result = clipSegmentsAroundLabels(segs, labels);
        expect(result).toEqual(segs);
    });

    it('should clip a horizontal segment that passes through a label', () => {
        const segs = [{ x1: 0, y1: 0, x2: 200, y2: 0, dashed: false }];
        const labels = [{ left: 80, right: 120, top: -15, bottom: 15 }];
        const result = clipSegmentsAroundLabels(segs, labels);

        // Should produce two sub-segments
        expect(result.length).toBe(2);
        // First segment ends before the label
        expect(result[0].x1).toBe(0);
        expect(result[0].x2).toBeLessThan(80);
        // Second segment starts after the label
        expect(result[1].x1).toBeGreaterThan(120);
        expect(result[1].x2).toBe(200);
    });

    it('should clip a vertical segment that passes through a label', () => {
        const segs = [{ x1: 50, y1: 0, x2: 50, y2: 200, dashed: false }];
        const labels = [{ left: 30, right: 70, top: 80, bottom: 120 }];
        const result = clipSegmentsAroundLabels(segs, labels);

        expect(result.length).toBe(2);
        expect(result[0].y2).toBeLessThan(80);
        expect(result[1].y1).toBeGreaterThan(120);
    });

    it('should handle a segment entirely inside a label (produces empty)', () => {
        const segs = [{ x1: 90, y1: 0, x2: 110, y2: 0, dashed: false }];
        const labels = [{ left: 80, right: 120, top: -15, bottom: 15 }];
        const result = clipSegmentsAroundLabels(segs, labels);

        // Segment fully inside label, should be removed
        expect(result.length).toBe(0);
    });

    it('should preserve dashed attribute after clipping', () => {
        const segs = [{ x1: 0, y1: 0, x2: 200, y2: 0, dashed: true }];
        const labels = [{ left: 80, right: 120, top: -15, bottom: 15 }];
        const result = clipSegmentsAroundLabels(segs, labels);

        result.forEach(s => expect(s.dashed).toBe(true));
    });

    it('should handle multiple labels clipping the same segment', () => {
        const segs = [{ x1: 0, y1: 0, x2: 400, y2: 0, dashed: false }];
        const labels = [
            { left: 80, right: 120, top: -15, bottom: 15 },
            { left: 250, right: 300, top: -15, bottom: 15 }
        ];
        const result = clipSegmentsAroundLabels(segs, labels);

        // 3 sub-segments: before label1, between labels, after label2
        expect(result.length).toBe(3);
    });
});

// ─── Integration Tests: Cached API Responses ─────────────────────────────────

const PROVIDER_CLOUD_COMBOS = [
    ['gemini', 'aws'],
    ['gemini', 'azure'],
    ['gemini', 'gcp'],
    ['gemini', 'none'],
    ['groq', 'aws'],
    ['groq', 'azure'],
    ['groq', 'gcp'],
    ['groq', 'none']
];

describe('Connector-Label Clipping – cached API response integration', () => {

    PROVIDER_CLOUD_COMBOS.forEach(([provider, cloud]) => {
        it(`no clipped segment passes through any label — ${provider} × ${cloud}`, () => {
            const filename = pickCachedFile(provider, cloud);
            expect(filename).not.toBeNull();

            const rawDiagram = loadCachedDiagram(filename);
            expect(rawDiagram).not.toBeNull();
            expect(rawDiagram.components?.length).toBeGreaterThan(0);
            expect(rawDiagram.connections?.length).toBeGreaterThan(0);

            const { connectionData, allLabelBounds } = computeConnectionLayout(rawDiagram);

            // For every connection, verify no clipped segment intersects any label
            for (const cd of connectionData) {
                for (const seg of cd.clippedSegments) {
                    for (const label of allLabelBounds) {
                        const intersects = segmentIntersectsLabel(seg, label);
                        if (intersects) {
                            const segDesc = `seg(${seg.x1.toFixed(0)},${seg.y1.toFixed(0)}→${seg.x2.toFixed(0)},${seg.y2.toFixed(0)})`;
                            const lblDesc = `label(${label.left.toFixed(0)},${label.top.toFixed(0)}→${label.right.toFixed(0)},${label.bottom.toFixed(0)})`;
                            expect.fail(
                                `Connection "${cd.conn.label}" (idx ${cd.idx}): ${segDesc} passes through ${lblDesc}` +
                                ` in ${provider}/${cloud} (${filename})`
                            );
                        }
                    }
                }
            }
        });
    });
});
