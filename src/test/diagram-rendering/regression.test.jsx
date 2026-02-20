
import { describe, it, expect } from 'vitest';
import { layoutDiagram } from '../../../server/utils/diagramLayout.js';

describe('Regression Tests', () => {
    describe('Orphan Component Healing', () => {
        it('should add orphaned components to a layer', () => {
            const architecture = {
                components: [
                    { id: 'c1', name: 'Web' },
                    { id: 'c2', name: 'DB' }
                ],
                layers: [
                    { name: 'Application', componentIds: ['c1'] }
                ],
                connections: []
            };

            const result = layoutDiagram(architecture, 'Test', { isMobile: false, isTablet: false });

            // c2 should be added to layer 0
            expect(result.layers[0].componentIds).toContain('c2');
        });
    });

    describe('Isolated Component Healing', () => {
        it('should connect isolated components', () => {
            const architecture = {
                components: [
                    { id: 'c1', name: 'API Gateway' },
                    { id: 'c2', name: 'Lambda' }
                ],
                layers: [
                    { name: 'Application', componentIds: ['c1', 'c2'] }
                ],
                connections: []
            };

            const result = layoutDiagram(architecture, 'Test', { isMobile: false, isTablet: false });

            // Check for inferred connection
            const hasConnection = result.connections.some(c => c.to === 'c2' && c.label === 'Inferred');
            expect(hasConnection).toBe(true);
        });
    });

    describe('Layout Calculation', () => {
        it('should calculate coordinates for components', () => {
            const architecture = {
                components: [
                    { id: 'c1', name: 'Web' }
                ],
                layers: [
                    { name: 'Application', componentIds: ['c1'] }
                ],
                connections: []
            };

            const result = layoutDiagram(architecture, 'Test', { isMobile: false, isTablet: false });

            expect(result.components[0].x).toBeGreaterThan(0);
            expect(result.components[0].y).toBeGreaterThan(0);
        });
    });
});
