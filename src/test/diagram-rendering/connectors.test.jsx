
import { describe, it, expect } from 'vitest';
import { getConnectorColor, getDistributedPoint, segmentPassesThroughComponent, pathIntersectsObstacles } from '../../utils/diagramLayout';

describe('Connector Routing Rules', () => {
    describe('Color Coding', () => {
        it('should cycle through 8 distinct colors', () => {
            const colors = new Set();
            for (let i = 0; i < 8; i++) {
                colors.add(getConnectorColor(i));
            }
            expect(colors.size).toBe(8);
        });

        it('should repeat colors after 8', () => {
            expect(getConnectorColor(0)).toBe(getConnectorColor(8));
            expect(getConnectorColor(1)).toBe(getConnectorColor(9));
        });
    });

    describe('Distributed Connection Points', () => {
        const comp = { x: 100, y: 100, width: 200, height: 100 };
        // corners: tl(0,50), tr(200,50), bl(0,150), br(200,150) -> relative to center x,y?
        // Logic: x is center, y is center.
        // tl: (0, 50), tr: (200, 50), bl: (0, 150), br: (200, 150)
        // width 200 => -100 to +100 relative to x.
        // height 100 => -50 to +50 relative to y.
        // top edge y = 100 - 50 = 50.
        // bottom edge y = 100 + 50 = 150.
        // left edge x = 100 - 100 = 0.
        // right edge x = 100 + 100 = 200.

        it('should center single connection', () => {
            const point = getDistributedPoint(comp, 'top', 0, 1);
            expect(point).toEqual({ x: 100, y: 50 });
        });

        it('should distribute multiple connections with padding', () => {
            // Edge padding is 30. Available width = 200 - 60 = 140.
            // 3 connections: index 0, 1, 2. Spacing = 140 / 2 = 70.
            // StartX = 0 + 30 = 30.
            // Points: 30, 100, 170.
            // PREFERRED_GAP is 40. StartX is 100 - (2 * 40)/2 = 60.
            // Spacing is 60, 100, 140
            const p1 = getDistributedPoint(comp, 'top', 0, 3);
            const p2 = getDistributedPoint(comp, 'top', 1, 3);
            const p3 = getDistributedPoint(comp, 'top', 2, 3);

            expect(p1.x).toBe(60);
            expect(p2.x).toBe(100);
            expect(p3.x).toBe(140);
        });
    });

    describe('Obstacle Avoidance', () => {
        const fileComp = { x: 100, y: 100, width: 100, height: 100 }; // 50-150, 50-150
        // Test segmentPassesThroughComponent
        it('should detect segment passing through component', () => {
            // Line from (0, 100) to (200, 100) passes through center
            expect(segmentPassesThroughComponent(0, 100, 200, 100, fileComp)).toBe(true);
        });

        it('should not detect segment completely outside', () => {
            expect(segmentPassesThroughComponent(0, 0, 200, 0, fileComp)).toBe(false);
        });

        // Test pathIntersectsObstacles
        it('should detect path intersection with obstacles', () => {
            const obstacles = [{ left: 50, right: 150, top: 50, bottom: 150 }];
            const path = [{ x: 0, y: 100 }, { x: 200, y: 100 }];
            expect(pathIntersectsObstacles(path, obstacles)).toBe(true);
        });
    });
});
