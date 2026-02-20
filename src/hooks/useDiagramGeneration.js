import { useState, useCallback } from 'react';
import { generateDiagramApi } from '../services/apiClient.js';

export const useDiagramGeneration = () => {
    const [diagram, setDiagram] = useState(null);
    const [cacheInfo, setCacheInfo] = useState(null);
    const [diagnostics, setDiagnostics] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [quotaExceeded, setQuotaExceeded] = useState(false);

    const generateDiagram = useCallback(async (
        systemDescription,
        provider,
        cloudProvider,
        isMobile,
        isTablet
    ) => {
        setLoading(true);
        setError(null);
        setQuotaExceeded(false);

        try {
            const data = await generateDiagramApi(
                systemDescription,
                provider,
                cloudProvider,
                isMobile,
                isTablet
            );

            setDiagram(data.diagram);
            setCacheInfo(data.cacheInfo);
            setDiagnostics(data.diagnostics);

            // Log analytics to console for debugging
            if (!data.fromCache) {
                console.log(`[Frontend] Successfully generated new diagram using ${provider} (${data.diagnostics?.model || 'unknown'})`);
            } else {
                console.log(`[Frontend] Served diagram from cache`);
            }

        } catch (err) {
            console.error('Error in useDiagramGeneration:', err);

            const errorMessage = err.message || '';
            if (errorMessage.includes('Rate limit') || errorMessage.includes('rate-limited') || errorMessage.includes('429')) {
                setQuotaExceeded({
                    title: 'Quota Exceeded',
                    message: `The selected API (${provider}) is currently exhausted. Please select a different API provider or try again later.`
                });
            } else if (errorMessage.includes('503 Service Unavailable') || errorMessage.includes('temporarily overloaded')) {
                setError("The requested model is currently overloaded. Don't worry, this happens during high traffic. Please try again in a few moments, or select a different provider.");
            } else {
                setError(errorMessage || 'An unexpected error occurred. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    }, []);

    return {
        diagram,
        loading,
        error,
        quotaExceeded,
        cacheInfo,
        diagnostics,
        generateDiagram,
        setDiagram,
        setQuotaExceeded,
        setError
    };
};
