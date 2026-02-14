
import { describe, it, expect } from 'vitest';
import { testPrompts } from '../fixtures/prompts';
import { layoutDiagram } from '../../utils/diagramLayout';
import { mockDiagramResponse } from '../fixtures/mockResponse';

describe('Prompt Fixtures Data Integrity', () => {

    it('should have correct number of prompts', () => {
        expect(Object.keys(testPrompts).length).toBe(60);
    });

    Object.entries(testPrompts).forEach(([key, description]) => {
        describe(`Prompt: ${key}`, () => {
            it('should have a valid description string', () => {
                expect(description).toBeTruthy();
                expect(typeof description).toBe('string');
                expect(description.length).toBeGreaterThan(5);
            });

            it('should simulate layout generation', () => {
                const layout = layoutDiagram(mockDiagramResponse.diagram, `Test: ${key}`, { isMobile: false, isTablet: false });
                expect(layout).toBeTruthy();
                expect(layout.systemName).toContain(key);
            });
        });
    });
});
