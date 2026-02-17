import express from 'express';
import cors from 'cors';
import { generateDiagram, geminiLimiter, groqLimiter } from '../src/services/diagram.js';
import { clearCache, deleteCacheEntry, getCacheStats } from '../src/services/cache.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

/**
 * GET /api/gemini-status
 * Returns health and usage stats for Gemini models
 */
app.get('/api/gemini-status', (req, res) => {
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
});

/**
 * GET /api/groq-status
 * Returns health and usage stats for Groq models
 */
app.get('/api/groq-status', (req, res) => {
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
});

/**
 * Validation Middleware for diagram generation
 */
const validateDiagramRequest = (req, res, next) => {
    const { systemDescription } = req.body;
    if (!systemDescription || typeof systemDescription !== 'string' || systemDescription.trim().length === 0) {
        return res.status(400).json({
            success: false,
            error: 'Invalid systemDescription. A non-empty string is required.'
        });
    }
    next();
};

/**
 * POST /api/generate-diagram
 * Accepts systemDescription and returns generated diagram (with caching)
 */
app.post('/api/generate-diagram', validateDiagramRequest, async (req, res) => {
    const { systemDescription, instructions, provider, cloudProvider } = req.body;

    try {
        const result = await generateDiagram(systemDescription, instructions || '', provider, cloudProvider);
        res.status(200).json(result);
    } catch (error) {
        console.error('[Generate Diagram Error]', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * DELETE /api/cache/:key
 * Clears specific cache entry
 */
app.delete('/api/cache/:key', (req, res) => {
    const { key } = req.params;
    const deleted = deleteCacheEntry(key);

    res.status(200).json({
        success: true,
        message: deleted ? `Cache entry ${key} deleted` : `Cache entry ${key} not found`,
        key
    });
});

/**
 * DELETE /api/cache
 * Clears all cached diagrams
 */
app.delete('/api/cache', (req, res) => {
    clearCache();
    res.status(200).json({
        success: true,
        message: 'All cache entries cleared'
    });
});

/**
 * GET /api/cache/stats
 * Returns cache statistics
 */
app.get('/api/cache/stats', (req, res) => {
    const stats = getCacheStats();
    res.status(200).json({
        success: true,
        stats
    });
});

/**
 * GET /api/health
 * Returns service health and connection status
 */
app.get('/api/health', (req, res) => {
    res.status(200).json({
        success: true,
        status: 'Healthy',
        service: 'Diagram Generation Service',
        timestamp: new Date().toISOString(),
        cache: 'In-Memory (Enabled)'
    });
});

// Error Handling Middleware
app.use((err, req, res, next) => {
    console.error('[Server Error]', err);
    res.status(500).json({
        success: false,
        error: 'Internal Server Error'
    });
});

app.listen(PORT, () => {
    console.log(`[Server] Diagram Generation Service running on http://localhost:${PORT}`);
    console.log(`[Server] Health check: http://localhost:${PORT}/api/health`);
});
