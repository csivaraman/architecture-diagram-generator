import express from 'express';
import cors from 'cors';
import diagramRoutes from './routes/diagramRoutes.js';
import { serverConfig } from './config/config.js';

const app = express();
const PORT = serverConfig.port;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api', diagramRoutes);

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
