import { API_ENDPOINTS } from '../config/constants.js';

export const generateDiagramApi = async (systemDescription, provider, cloudProvider, isMobile, isTablet) => {
    const response = await fetch(API_ENDPOINTS.GENERATE_DIAGRAM, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            systemDescription,
            provider,
            cloudProvider,
            isMobile,
            isTablet
        }),
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || 'Failed to generate diagram');
    }

    if (!data.success) {
        throw new Error(data.error || 'Diagram generation reported failure');
    }

    return data;
};
