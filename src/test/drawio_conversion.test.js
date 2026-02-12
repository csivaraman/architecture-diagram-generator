
import { convertToDrawioXml } from '../utils/drawioIntegration.js';
import { test, expect } from 'vitest';

test('convertToDrawioXml generates valid XML structure', () => {
    const mockDiagram = {
        systemName: 'Test System',
        components: [
            { id: 'c1', name: 'Frontend', type: 'frontend', x: 100, y: 100, width: 120, height: 60 },
            { id: 'c2', name: 'Backend', type: 'backend', x: 300, y: 100, width: 120, height: 60 },
            { id: 'c3', name: 'DB', type: 'Database', x: 500, y: 100, width: 120, height: 60 }, // Test case sensitivity
            { id: 'c4', name: 'User', type: 'user', x: 700, y: 100, width: 120, height: 60 }     // Test user shape
        ],
        connections: [
            { from: 'c1', to: 'c2', label: 'HTTP', type: 'sync' }
        ],
        layers: [
            { name: 'Presentation', componentIds: ['c1'] },
            { name: 'Application', componentIds: ['c2'] }
        ],
        layerHeight: 200,
        paddingTop: 60,
        width: 800
    };

    const xml = convertToDrawioXml(mockDiagram);

    // Basic checks
    expect(xml).toContain('<mxfile host="app.diagrams.net"');
    expect(xml).toContain('<diagram name="Page-1"');
    expect(xml).toContain('<mxGraphModel');

    // Component checks
    expect(xml).toContain('value="Frontend"');
    expect(xml).toContain('style="rounded=1;whiteSpace=wrap;html=1;fillColor=#dbeafe;strokeColor=#2563eb;fontColor=#1e40af;"');
    expect(xml).toContain('x="40"');
    expect(xml).toContain('y="70"');

    // Connection checks
    expect(xml).toContain('value="HTTP"');
    expect(xml).toContain('source="c1" target="c2"');

    // Layer checks
    expect(xml).toContain('value="Presentation LAYER"');
    expect(xml).toContain('style="whiteSpace=wrap;html=1;fillColor=#f8fafc;');

    // Shape checks
    // Database (capitalized input) should become cylinder
    expect(xml).toContain('shape=cylinder3');

    // User should become actor
    expect(xml).toContain('shape=actor');
});
