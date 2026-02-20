export const downloadSVG = async (diagram) => {
    if (!diagram) return;
    const svgElement = document.getElementById('architecture-svg');
    if (!svgElement) {
        console.error('SVG element not found');
        return;
    }

    // Clone for serialization
    const clonedSvg = svgElement.cloneNode(true);
    clonedSvg.setAttribute('version', '1.1');
    clonedSvg.setAttribute('baseProfile', 'full');
    clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clonedSvg.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink'); // Needed for href
    clonedSvg.setAttribute('xmlns:xhtml', 'http://www.w3.org/1999/xhtml');

    // Fetch and embed all images as base64
    const images = clonedSvg.querySelectorAll('image');
    for (const img of images) {
        let href = img.getAttribute('href') || img.getAttribute('xlink:href');
        if (href && !href.startsWith('data:')) {
            try {
                const response = await fetch(href);
                const blob = await response.blob();
                const base64data = await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result);
                    reader.readAsDataURL(blob);
                });

                img.setAttribute('href', base64data);
            } catch (err) {
                console.error('Failed to inline image:', href, err);
            }
        }
    }

    // Serialize to XML
    const serializer = new XMLSerializer();
    let svgData = serializer.serializeToString(clonedSvg);

    if (!svgData.startsWith('<?xml')) {
        svgData = '<?xml version="1.0" standalone="no"?>\\n' + svgData;
    }

    // Alternative Method: Data URI (Base64)
    const base64Data = btoa(unescape(encodeURIComponent(svgData)));
    const dataUri = `data:image/svg+xml;base64,${base64Data}`;

    // Sanitize filename
    const safeName = diagram.systemName
        .replace(/[^\\w\\s-]/g, '')
        .trim()
        .replace(/\\s+/g, '-');

    const link = document.createElement('a');
    link.href = dataUri;
    link.download = `${safeName || 'architecture'}-diagram.svg`;

    document.body.appendChild(link);
    link.click();

    // Cleanup
    setTimeout(() => {
        document.body.removeChild(link);
    }, 500);
};
