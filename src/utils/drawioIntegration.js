export const convertToDrawioXml = (data) => {
    // Basic XML escaping
    const escape = (str) => {
        if (!str) return '';
        return str.replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    };

    let xml = '<mxfile host="app.diagrams.net" modified="' + new Date().toISOString() + '" agent="ArchitectureDiagramGenerator" version="21.0.0" type="device">';
    xml += '<diagram name="Page-1" id="diagram_1">';
    xml += '<mxGraphModel dx="1422" dy="794" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="850" pageHeight="1100" math="0" shadow="0">';
    xml += '<root>';
    xml += '<mxCell id="0" />';
    xml += '<mxCell id="1" parent="0" />';

    // Styles map
    const styles = {
        frontend: 'rounded=1;whiteSpace=wrap;html=1;fillColor=#dbeafe;strokeColor=#2563eb;fontColor=#1e40af;',
        backend: 'rounded=1;whiteSpace=wrap;html=1;fillColor=#d1fae5;strokeColor=#059669;fontColor=#065f46;',
        database: 'shape=cylinder3;whiteSpace=wrap;html=1;boundedLbl=1;backgroundOutline=1;size=15;fillColor=#fef3c7;strokeColor=#d97706;fontColor=#92400e;',
        cache: 'shape=hexagon;perimeter=hexagonPerimeter2;whiteSpace=wrap;html=1;fixedSize=1;fillColor=#fce7f3;strokeColor=#db2777;fontColor=#9d174d;',
        queue: 'shape=offPageConnector;whiteSpace=wrap;html=1;fillColor=#ede9fe;strokeColor=#7c3aed;fontColor=#5b21b6;direction=south;',
        api: 'rounded=1;whiteSpace=wrap;html=1;fillColor=#cffafe;strokeColor=#0891b2;fontColor=#155f75;arcSize=50;',
        service: 'rounded=1;whiteSpace=wrap;html=1;fillColor=#ccfbf1;strokeColor=#d97706;fontColor=#115e59;',
        external: 'ellipse;whiteSpace=wrap;html=1;fillColor=#f3f4f6;strokeColor=#4b5563;fontColor=#1f2937;',
        user: 'shape=actor;whiteSpace=wrap;html=1;fillColor=#ffedd5;strokeColor=#f97316;fontColor=#c2410c;'
    };

    // Helper to get style string (normalize to lowercase)
    const getStyle = (type) => styles[(type || '').toLowerCase()] || styles.service;

    // Add Layers (Background Groups)
    if (data.layers && data.layerHeight) {
        data.layers.forEach((layer, index) => {
            const layerTop = (data.paddingTop || 60) + (index * data.layerHeight);
            const label = escape(layer.name + ' LAYER');

            // Visual style for the layer container
            const layerStyle = 'whiteSpace=wrap;html=1;fillColor=#f8fafc;strokeColor=#e2e8f0;strokeWidth=2;dashed=0;align=left;verticalAlign=top;spacingLeft=10;spacingTop=10;fontColor=#64748b;fontStyle=1;fontSize=14;';

            // Fixed offset matching App.jsx rendering (x=20)
            const x = 20;
            const y = layerTop;
            const width = (data.width || 800) - 40;
            const height = (data.layerHeight || 200) - 20;

            const layerId = `layer_${index}`;

            xml += `<mxCell id="${layerId}" value="${label}" style="${layerStyle}" vertex="1" parent="1">`;
            xml += `<mxGeometry x="${x}" y="${y}" width="${width}" height="${height}" as="geometry" />`;
            xml += `</mxCell>`;
        });
    }

    // Add Components
    if (data.components) {
        data.components.forEach((comp) => {
            const style = getStyle(comp.type);
            const label = escape(comp.name);

            // x, y in the app are center-based, draw.io uses top-left
            // Default to 0 if not present (though they should be)
            const width = comp.width || 120;
            const height = comp.height || 60;
            const x = (comp.x || 0) - (width / 2);
            const y = (comp.y || 0) - (height / 2);

            // We must wrap the XML content in the style correctly
            // Actually, draw.io XML structure for cells is:
            // <mxCell id="..." value="..." style="..." vertex="1" parent="1">
            //   <mxGeometry x="..." y="..." width="..." height="..." as="geometry"/>
            // </mxCell>

            xml += `<mxCell id="${comp.id}" value="${label}" style="${style}" vertex="1" parent="1">`;
            xml += `<mxGeometry x="${x}" y="${y}" width="${width}" height="${height}" as="geometry" />`;
            xml += `</mxCell>`;
        });
    }

    // Add Connections
    if (data.connections) {
        data.connections.forEach((conn, index) => {
            const isAsync = conn.type === 'async';
            // dashed=1 for async
            let style = 'edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;';
            if (isAsync) {
                style += 'dashed=1;strokeColor=#94a3b8;';
            } else {
                style += 'strokeColor=#64748b;';
            }

            // Label for the connection
            const label = conn.label ? escape(conn.label) : '';

            // We use a unique ID for the edge
            const edgeId = `edge_${index}`;

            // Check if source/target exist to avoid broken links
            const sourceExists = data.components.some(c => c.id === conn.from);
            const targetExists = data.components.some(c => c.id === conn.to);

            if (sourceExists && targetExists) {
                xml += `<mxCell id="${edgeId}" value="${label}" style="${style}" edge="1" parent="1" source="${conn.from}" target="${conn.to}">`;
                xml += `<mxGeometry relative="1" as="geometry" />`;
                xml += `</mxCell>`;
            }
        });
    }

    xml += '</root>';
    xml += '</mxGraphModel>';
    xml += '</diagram>';
    xml += '</mxfile>';

    return xml;
};

export const openInDrawioWithLocalStorage = (geminiData) => {
    const xmlData = convertToDrawioXml(geminiData);

    // Store in localStorage with a unique key
    const storageKey = `drawio-diagram-${Date.now()}`;
    localStorage.setItem(storageKey, xmlData);

    // Create a data URL for a bridge page that embeds Draw.io in an iframe
    // This avoids URL length limits and proxy errors (since we use postMessage)
    const bridgeHtml = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Editing Diagram...</title>
        <style>
            body { margin: 0; padding: 0; overflow: hidden; }
            iframe { border: none; width: 100vw; height: 100vh; }
        </style>
    </head>
    <body>
        <iframe id="drawio" src="https://embed.diagrams.net/?embed=1&ui=atlas&spin=1&proto=json&noExitBtn=1"></iframe>
        <script>
            const iframe = document.getElementById('drawio');
            const xml = localStorage.getItem('${storageKey}');
            
            // Listen for the 'init' message from Draw.io
            window.addEventListener('message', (event) => {
                // Ensure message comes from the iframe
                if (event.source !== iframe.contentWindow) return;
                
                let msg;
                try {
                    msg = JSON.parse(event.data);
                } catch (e) {
                    return; // Ignore non-JSON messages
                }
                
                if (msg.event === 'init') {
                    // Send the load command
                    iframe.contentWindow.postMessage(JSON.stringify({
                        action: 'load',
                        xml: xml,
                        autosave: 0 // Disable autosave for now as we don't have a backend listener
                    }), '*');
                }
                
                // Optional: Listen for save/export
                if (msg.event === 'save') {
                   // In a real app we would post this back to the parent or download
                   // For now, Draw.io's internal save (Download) usually works via the menu if configured,
                   // but with embed=1, the save button sends a message.
                   // We can trigger a download here if we receive the XML back.
                   if (msg.xml) {
                        const blob = new Blob([msg.xml], {type: 'application/xml'});
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = 'diagram.drawio.xml';
                        a.click();
                   }
                }
            });
        </script>
    </body>
    </html>
  `;

    const blob = new Blob([bridgeHtml], { type: 'text/html' });
    const bridgeUrl = URL.createObjectURL(blob);

    // Open in new tab
    window.open(bridgeUrl, '_blank');
};
