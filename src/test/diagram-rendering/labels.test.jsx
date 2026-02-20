
import { describe, it, expect } from 'vitest';
import { labelCollides, findBestLabelPosition } from '../../../server/utils/connectorEngine.js';

describe('Label Placement Rules', () => {
    describe('Collision Detection', () => {
        const components = [
            { id: 'c1', x: 100, y: 100, width: 100, height: 60 }
        ];
        const placedLabels = [
            { left: 200, right: 300, top: 100, bottom: 130 }
        ];

        it('should detect collision with component', () => {
            expect(labelCollides(100, 100, [], components, placedLabels, 90, 26)).toBe(true);
        });

        it('should detect collision with component buffer', () => {
            expect(labelCollides(180, 100, [], components, placedLabels, 90, 26)).toBe(true);
        });

        it('should detect collision with other labels', () => {
            expect(labelCollides(250, 115, [], components, placedLabels, 90, 26)).toBe(true);
        });

        it('should allow placement in clear space', () => {
            expect(labelCollides(400, 400, [], components, placedLabels, 90, 26)).toBe(false);
        });

        const groups = [
            { x: 100, y: 100, width: 200, height: 200, name: 'MyGroup' }
        ];

        it('should detect collision with group label (top-left)', () => {
            // Group label is around (100, 100) -> (180, 135)
            expect(labelCollides(120, 110, [], [], [], 90, 26, groups)).toBe(true);
        });

        it('should detect collision with group top border', () => {
            // Border is at y=100. Label at y=100 should collide
            expect(labelCollides(200, 100, [], [], [], 90, 26, groups)).toBe(true);
        });

        it('should detect collision with group left border', () => {
            // Border is at x=100. Label at x=100 should collide
            expect(labelCollides(100, 200, [], [], [], 90, 26, groups)).toBe(true);
        });

        it('should allow placement inside group (away from borders)', () => {
            // Center of group (200, 200) should be fine
            expect(labelCollides(200, 200, [], [], [], 90, 26, groups)).toBe(false);
        });
    });

    describe('Position Finding', () => {
        it('should find longest segment for label', () => {
            const path = [
                { x: 0, y: 0 },
                { x: 10, y: 0 },
                { x: 100, y: 0 },
                { x: 110, y: 0 }
            ];
            const best = findBestLabelPosition(path);
            expect(best.index).toBe(1);
        });
    });
});
