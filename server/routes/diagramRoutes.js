import express from 'express';
import {
    getGeminiStatus,
    getGroqStatus,
    generateDiagramController,
    deleteCacheItem,
    clearAllCache,
    getCacheStatistics,
    getHealth
} from '../controllers/diagramController.js';

const router = express.Router();

router.get('/gemini-status', getGeminiStatus);
router.get('/groq-status', getGroqStatus);
router.post('/generate-diagram', generateDiagramController);
router.delete('/cache/:key', deleteCacheItem);
router.delete('/cache', clearAllCache);
router.get('/cache/stats', getCacheStatistics);
router.get('/health', getHealth);

export default router;
