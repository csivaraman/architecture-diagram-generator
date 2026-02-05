export default function handler(req, res) {
    res.status(200).json({
        success: true,
        status: 'Healthy',
        service: 'Diagram Generation Service (Serverless)',
        timestamp: new Date().toISOString(),
        cache: 'In-Memory (Ephemeral)'
    });
}
