import { generateDiagram, geminiLimiter, groqLimiter } from '../services/diagramService.js';
import { clearCache, deleteCacheEntry, getCacheStats } from '../services/cacheService.js';
import { layoutDiagram } from '../utils/diagramLayout.js';
import { layoutCloudDiagram } from '../utils/cloudLayout.js';
import { normalizeDiagram } from '../services/diagramProcessor.js';

export const getGeminiStatus = (req, res) => {
    try {
        const stats = geminiLimiter.getStats();
        const recommended = geminiLimiter.getRecommendedModels();

        const summary = {
            recommendedModels: recommended,
            modelHealth: geminiLimiter.modelHealth,
            performanceStats: geminiLimiter.performanceStats,
            keyUsage: Object.keys(stats).map(keyIndex => {
                const models = stats[keyIndex];
                return {
                    keyIndex: parseInt(keyIndex) + 1,
                    models: Object.keys(models).map(model => ({
                        name: model,
                        rpm: `${models[model].requestCount}/${Math.floor(geminiLimiter.models[model].rpm * 0.8)}`,
                        rpd: `${models[model].dailyCount}/${Math.floor(geminiLimiter.models[model].rpd * 0.8)}`,
                        available: models[model].dailyCount < Math.floor(geminiLimiter.models[model].rpd * 0.8)
                    }))
                };
            })
        };

        res.status(200).json(summary);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const getGroqStatus = (req, res) => {
    try {
        const stats = groqLimiter.getStats();
        const recommended = groqLimiter.getRecommendedModels();

        const summary = {
            recommendedModels: recommended,
            modelHealth: groqLimiter.modelHealth,
            performanceStats: groqLimiter.performanceStats,
            keyUsage: Object.keys(stats).map(keyIndex => {
                const models = stats[keyIndex];
                return {
                    keyIndex: parseInt(keyIndex) + 1,
                    models: Object.keys(models).map(model => ({
                        name: model,
                        rpm: `${models[model].requestCount}/${Math.floor(groqLimiter.models[model].rpm * 0.8)}`,
                        rpd: `${models[model].dailyCount}/${Math.floor(groqLimiter.models[model].rpd * 0.8)}`,
                        available: models[model].dailyCount < Math.floor(groqLimiter.models[model].rpd * 0.8)
                    }))
                };
            })
        };

        res.status(200).json(summary);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const generateDiagramController = async (req, res) => {
    const { systemDescription, instructions, provider, cloudProvider, isMobile = false, isTablet = false } = req.body;

    if (!systemDescription || typeof systemDescription !== 'string' || systemDescription.trim().length === 0) {
        return res.status(400).json({
            success: false,
            error: 'Invalid systemDescription. A non-empty string is required.'
        });
    }

    try {
        const result = await generateDiagram(systemDescription, instructions || '', provider, cloudProvider);

        // Normalize the raw diagram from LLM
        const architecture = normalizeDiagram(result.diagram);
        const generatedSystemName = architecture.systemName || 'System Architecture';

        // Perform BOTH layouts to provide a consolidated response
        const legacyLayout = layoutDiagram(JSON.parse(JSON.stringify(architecture)), generatedSystemName, { isMobile, isTablet });
        const cloudLayout = layoutCloudDiagram(JSON.parse(JSON.stringify(architecture)), generatedSystemName, { isMobile, isTablet });

        // Determine initial mode based on request
        const isCloudMode = cloudProvider !== 'none';

        // Consolidated response including both layout versions
        const consolidatedDiagram = {
            ...(isCloudMode ? cloudLayout : legacyLayout), // Top level is the requested layout
            legacyVersion: legacyLayout,
            cloudVersion: cloudLayout,
            isCloudMode: isCloudMode,
            raw: architecture
        };

        res.status(200).json({
            ...result,
            diagram: consolidatedDiagram
        });
    } catch (error) {
        console.error('[Generate Diagram Error]', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

export const deleteCacheItem = (req, res) => {
    const { key } = req.params;
    const deleted = deleteCacheEntry(key);

    res.status(200).json({
        success: true,
        message: deleted ? `Cache entry ${key} deleted` : `Cache entry ${key} not found`,
        key
    });
};

export const clearAllCache = (req, res) => {
    clearCache();
    res.status(200).json({
        success: true,
        message: 'All cache entries cleared'
    });
};

export const getCacheStatistics = (req, res) => {
    const stats = getCacheStats();
    res.status(200).json({
        success: true,
        stats
    });
};

export const getHealth = (req, res) => {
    res.status(200).json({
        success: true,
        status: 'Healthy',
        service: 'Diagram Generation Service',
        timestamp: new Date().toISOString(),
        cache: 'In-Memory (Enabled)'
    });
};
