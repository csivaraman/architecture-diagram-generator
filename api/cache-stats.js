import { getCacheStats } from '../src/services/cache.js';

export default function handler(req, res) {
    const stats = getCacheStats();
    res.status(200).json({
        success: true,
        stats
    });
}
