import express from 'express';
import cors from 'cors';
import { generateDiagram } from '../src/services/diagram.js';
import { clearCache, deleteCacheEntry, getCacheStats } from '../src/services/cache.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

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
    const { systemDescription, instructions } = req.body;

    try {
        const result = await generateDiagram(systemDescription, instructions || '');
        res.status(200).json(result);
    } catch (error) {
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
