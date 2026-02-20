
import { describe, it, expect } from 'vitest';
import { architectureTestCases } from '../../data/architectureTestCases';
import { layoutDiagram } from '../../../server/utils/diagramLayout.js';
import { mockDiagramResponse } from '../fixtures/mockResponse';

describe('Architecture Test Cases Data Integrity', () => {

    it('should have correct number of test cases', () => {
        expect(architectureTestCases.length).toBe(26);
    });

    architectureTestCases.forEach(tc => {
        describe(`Case ${tc.id}: ${tc.name}`, () => {
            it('should have a valid description', () => {
                expect(tc.description).toBeTruthy();
                expect(typeof tc.description).toBe('string');
                expect(tc.description.length).toBeGreaterThan(10);
            });

            it('should have a valid category', () => {
                expect(tc.category).toBeTruthy();
            });

            it('should process simulated success response', () => {
                const layout = layoutDiagram(mockDiagramResponse.diagram, tc.name, { isMobile: false, isTablet: false });
                expect(layout).toBeTruthy();
                expect(layout.systemName).toBe(tc.name);
                expect(layout.components.length).toBeGreaterThan(0);
            });
        });
    });
});
