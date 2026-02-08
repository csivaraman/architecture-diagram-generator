
import { convertToDrawioXml } from '../utils/drawioIntegration.js';
import assert from 'node:assert';
import test from 'node:test';

test('convertToDrawioXml generates valid XML structure', (t) => {
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
    assert.ok(xml.includes('<mxfile host="app.diagrams.net"'), 'Missing mxfile wrapper');
    assert.ok(xml.includes('<diagram name="Page-1"'), 'Missing diagram wrapper');
    assert.ok(xml.includes('<mxGraphModel'), 'Missing mxGraphModel');

    // Component checks
    assert.ok(xml.includes('value="Frontend"'), 'Missing Frontend component');
    assert.ok(xml.includes('style="rounded=1;whiteSpace=wrap;html=1;fillColor=#dbeafe;strokeColor=#2563eb;fontColor=#1e40af;"'), 'Missing Frontend style');
    assert.ok(xml.includes('x="40"'), 'Incorrect X calculation (100 - 60)');
    assert.ok(xml.includes('y="70"'), 'Incorrect Y calculation (100 - 30)');

    // Connection checks
    assert.ok(xml.includes('value="HTTP"'), 'Missing connection label');
    assert.ok(xml.includes('source="c1" target="c2"'), 'Missing connection source/target');

    // Layer checks
    assert.ok(xml.includes('value="Presentation LAYER"'), 'Missing Presentation layer');
    assert.ok(xml.includes('style="whiteSpace=wrap;html=1;fillColor=#f8fafc;'), 'Missing layer style');

    // Shape checks
    // Database (capitalized input) should become cylinder
    assert.ok(xml.includes('shape=cylinder3'), 'Missing database cylinder shape (case sensitivity check)');

    // User should become actor
    assert.ok(xml.includes('shape=actor'), 'Missing user actor shape');
});
