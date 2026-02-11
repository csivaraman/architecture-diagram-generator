import { generateDiagram } from '../src/services/diagram.js';

export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method Not Allowed' });
    }

    const { systemDescription, instructions, provider } = req.body;

    if (!systemDescription || typeof systemDescription !== 'string' || systemDescription.trim().length === 0) {
        return res.status(400).json({
            success: false,
            error: 'Invalid systemDescription. A non-empty string is required.'
        });
    }

    try {
        const result = await generateDiagram(systemDescription, instructions || '', provider);
        return res.status(200).json(result);
    } catch (error) {
        console.error('[API Error]', error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
}
