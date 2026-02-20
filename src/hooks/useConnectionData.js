import { useMemo } from 'react';
import {
    redistributeOvercrowdedEdges,
    getDistributedPoint,
    getConnectorColor
} from '../../server/utils/diagramLayout.js';
import {
    calculateConnectorPath,
    measureLabelText,
    findBestLabelPosition,
    findClearLabelPosition
} from '../../server/utils/connectorEngine.js';

/**
 * Computes all connection path data for rendering.
 * Used by both CloudDiagramRenderer and LegacyDiagramRenderer.
 *
 * @param {object} diagram - layoutDiagram or layoutCloudDiagram output
 * @param {object} options
 * @param {Array}  options.groups - positioned groups (cloud mode only)
 * @param {string} options.arrowIdPrefix - prefix for arrowhead marker IDs
 */
export const useConnectionData = (diagram, { groups = [], arrowIdPrefix = '' } = {}) => {
    return useMemo(() => {
        if (!diagram?.connections || !diagram?.components) return [];

        // Pass 1: Build connection point map
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

        // Pass 2: Compute paths and label positions
        const obstacles = diagram.components.map(c => ({
            ...c,
            left: c.x - c.width / 2 - 25,
            right: c.x + c.width / 2 + 25,
            top: c.y - c.height / 2 - 25,
            bottom: c.y + c.height / 2 + 25
        }));

        const placedLabels = [];
        const findAssignedEdge = (compId, connIdx) => {
            const points = connectionPoints.get(compId);
            if (!points) return 'bottom';
            for (const edge of ['top', 'bottom', 'left', 'right']) {
                if (points[edge].some(p => p.connIdx === connIdx)) return edge;
            }
            return 'bottom';
        };

        return diagram.connections.map((conn, idx) => {
            const fromComp = diagram.components.find(c => c.id === conn.from);
            const toComp = diagram.components.find(c => c.id === conn.to);
            if (!fromComp || !toComp) return null;

            const fromEdge = findAssignedEdge(fromComp.id, idx);
            const toEdge = findAssignedEdge(toComp.id, idx);

            const fromConnections = connectionPoints.get(fromComp.id)[fromEdge];
            const toConnections = connectionPoints.get(toComp.id)[toEdge];
            const fromIndex = fromConnections.findIndex(p => p.connIdx === idx);
            const toIndex = toConnections.findIndex(p => p.connIdx === idx);

            const start = getDistributedPoint(fromComp, fromEdge, fromIndex, fromConnections.length);
            const end = getDistributedPoint(toComp, toEdge, toIndex, toConnections.length);

            const { pathPoints, pathSegments } = calculateConnectorPath(
                start, end, fromEdge, toEdge,
                (idx % 3) * 15,
                ((idx % 3) - 1) * 90,
                obstacles,
                { width: fromComp.width, height: fromComp.height, x: fromComp.x, y: fromComp.y },
                { width: toComp.width, height: toComp.height, x: toComp.x, y: toComp.y }
            );

            const pathD = pathPoints.reduce(
                (acc, p, i) => acc + (i === 0 ? `M ${p.x} ${p.y}` : ` L ${p.x} ${p.y}`), ''
            );

            const labelDim = measureLabelText(conn.label);
            const bestSeg = findBestLabelPosition(pathPoints);
            const labelPos = conn.label
                ? findClearLabelPosition(
                    pathPoints, bestSeg.index,
                    diagram.components, placedLabels,
                    labelDim.width, labelDim.height,
                    groups
                )
                : { x: 0, y: 0 };

            if (conn.label) {
                placedLabels.push({
                    left: labelPos.x - labelDim.width / 2,
                    right: labelPos.x + labelDim.width / 2,
                    top: labelPos.y - labelDim.height / 2,
                    bottom: labelPos.y + labelDim.height / 2
                });
            }

            return {
                idx, conn, fromComp, toComp,
                pathD, pathPoints, pathSegments,
                labelPos, labelDim,
                color: getConnectorColor(idx),
                isAsync: conn.type === 'async',
                arrowIdPrefix
            };
        }).filter(Boolean);

    }, [diagram, groups, arrowIdPrefix]);
};
