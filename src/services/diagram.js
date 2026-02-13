import { GoogleGenerativeAI } from '@google/generative-ai';
import { getCachedDiagram, setCachedDiagram } from './cache.js';
import RateLimiter from './RateLimiter.js';
import dotenv from 'dotenv';

// Try to load .env.local, but don't fail if it's missing (Vercel uses production env vars)
try {
    dotenv.config({ path: ".env.local" });
} catch (e) {
    // Standard environment variables will be used
}

const GENERATION_CONFIG_GEMINI = {
    temperature: 0.7,
    maxOutputTokens: 4096,
};

/**
 * Initialize RateLimiters
 */
const GEMINI_KEYS = [
    process.env.VITE_GEMINI_API_KEY_1,
    process.env.VITE_GEMINI_API_KEY_2,
    process.env.VITE_GEMINI_API_KEY_3,
    process.env.VITE_GEMINI_API_KEY_4,
    process.env.VITE_GEMINI_API_KEY_5
].filter(Boolean);

if (GEMINI_KEYS.length === 0) {
    console.error('[Diagram Service] No Gemini API keys found');
}

const geminiLimiter = new RateLimiter(GEMINI_KEYS); // Uses default Gemini config

const GROQ_KEYS = [
    process.env.GROQ_KEY_1,
    process.env.GROQ_KEY_2,
    process.env.GROQ_KEY_3
].filter(Boolean);

const GROQ_CONFIG = {
    priority: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'],
    models: {
        'llama-3.3-70b-versatile': { rpm: 30, tpm: 20000, rpd: 1000, quality: 'high' },
        'llama-3.1-8b-instant': { rpm: 30, tpm: 20000, rpd: 14400, quality: 'medium' }
    }
};

const groqLimiter = new RateLimiter(GROQ_KEYS, GROQ_CONFIG, 'rate_limiter_stats_groq.json');

/**
 * Standard system prompt for the architect
 */
const DEFAULT_SYSTEM_PROMPT = `
You are an expert software architect.Generate a technical architecture diagram in JSON format for the given description.

Your response must have this exact structure:

{
    "systemName": "A short, descriptive title",
        "components": [
            {
                "id": "unique-id",
                "name": "Component Name",
                "type": "user|frontend|backend|database|cache|queue|api|service|external",
                "description": "Brief description",
                "technologies": ["tech1", "tech2"]
            }
        ],
            "connections": [
                {
                    "from": "component-id",
                    "to": "component-id",
                    "label": "Protocol",
                    "type": "sync|async|bidirectional"
                }
            ],
                "layers": [
                    {
                        "name": "Client|Presentation|Application|Data|Infrastructure",
                        "componentIds": ["id1", "id2"]
                    }
                ]
} `;

/**
 * wrapper for Gemini generation
 */
async function generateWithGemini(systemDescription, promptInstructions) {
    const prompt = `${DEFAULT_SYSTEM_PROMPT} \n\n${promptInstructions} \n\nDescription: ${systemDescription} \n\nGenerate the architecture JSON.`;
    let lastError;

    for (let attempt = 0; attempt < 10; attempt++) {
        const available = await geminiLimiter.getKeyAndModel();

        if (!available) {
            throw new Error('All Gemini API keys and models are currently rate-limited. Please try again later.');
        }

        const { keyIndex, model: modelName } = available;
        const apiKey = GEMINI_KEYS[keyIndex];
        const maskedKey = `${apiKey.substring(0, 6)}...${apiKey.substring(apiKey.length - 4)} `;

        console.log(`[Gemini Service] REQUEST: Key #${keyIndex + 1} (${maskedKey}) | Model: ${modelName} `);

        try {
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: modelName, generationConfig: GENERATION_CONFIG_GEMINI });

            let result;
            let retryCount = 0;
            const MAX_RETRIES = 1;

            while (true) {
                try {
                    result = await model.generateContent(prompt);
                    break;
                } catch (reqErr) {
                    const msg = (reqErr.message || '') + (reqErr.toString() || '');
                    if (msg.includes('503') || msg.includes('overloaded') || msg.includes('Service Unavailable')) {
                        if (retryCount < MAX_RETRIES) {
                            console.warn(`[Gemini Service] ⚠️ Model Overloaded (503). Waiting 10s...`);
                            await new Promise(resolve => setTimeout(resolve, 10000));
                            retryCount++;
                            continue;
                        }
                    }
                    throw reqErr;
                }
            }

            const response = await result.response;
            const text = response.text();

            // Clean markdown
            const cleanedContent = text
                .replace(/```json\n ?/g, '')
                .replace(/```\n?/g, '')
                .trim();

            const diagramData = JSON.parse(cleanedContent);

            geminiLimiter.recordRequest(keyIndex, modelName);

            return {
                diagram: diagramData,
                diagnostics: { keyId: keyIndex + 1, model: modelName, provider: 'gemini' }
            };

        } catch (err) {
            lastError = err;
            const errorMsg = err.message || '';
            const keyId = keyIndex + 1;

            if (errorMsg.includes('429') || errorMsg.includes('quota') || errorMsg.includes('Rate limit')) {
                console.warn(`[Gemini Service] Key #${keyId} | Model: ${modelName} hit rate limit.`);
                geminiLimiter.reportQuotaExceeded(keyIndex, modelName);
                continue;
            }

            if (errorMsg.includes('404') || errorMsg.includes('not found') || errorMsg.includes('supported')) {
                console.warn(`[Gemini Service] Key #${keyId} | Model: ${modelName} not available.`);
                geminiLimiter.reportQuotaExceeded(keyIndex, modelName);
                continue;
            }

            throw new Error(`Gemini generation failed: ${errorMsg}`);
        }
    }
    throw new Error(`Gemini generation failed after multiple attempts. Last error: ${lastError?.message}`);
}

/**
 * wrapper for Groq generation
 */
async function generateWithGroq(systemDescription, promptInstructions) {
    if (GROQ_KEYS.length === 0) {
        throw new Error('No Groq API keys configured.');
    }

    const prompt = `${DEFAULT_SYSTEM_PROMPT} \n\n${promptInstructions} \n\nDescription: ${systemDescription} \n\nGenerate the architecture JSON.`;
    let lastError;

    for (let attempt = 0; attempt < 10; attempt++) {
        const available = await groqLimiter.getKeyAndModel();

        if (!available) {
            throw new Error('All Groq API keys and models are currently rate-limited.');
        }

        const { keyIndex, model: modelName } = available;
        const apiKey = GROQ_KEYS[keyIndex];
        const maskedKey = `${apiKey.substring(0, 6)}...${apiKey.substring(apiKey.length - 4)} `;

        console.log(`[Groq Service] REQUEST: Key #${keyIndex + 1} (${maskedKey}) | Model: ${modelName} `);

        try {
            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: modelName,
                    messages: [
                        { role: 'system', content: DEFAULT_SYSTEM_PROMPT },
                        { role: 'user', content: `${promptInstructions}\n\nDescription: ${systemDescription}` }
                    ],
                    response_format: { type: 'json_object' },
                    temperature: 0.7,
                    max_tokens: 4096
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const errorMsg = errorData.error?.message || response.statusText;

                if (response.status === 429) {
                    console.warn(`[Groq Service] Key #${keyIndex + 1} | Model: ${modelName} hit rate limit (429).`);
                    groqLimiter.reportQuotaExceeded(keyIndex, modelName);
                    continue;
                }

                if (response.status >= 500) {
                    console.warn(`[Groq Service] Server error ${response.status}. Retrying...`);
                    // Retry once immediately for 500s? Or let the loop handle it via continue?
                    // Loop handles it by trying next key/model, which is safer
                    continue;
                }

                throw new Error(`Groq API Error ${response.status}: ${errorMsg}`);
            }

            const data = await response.json();
            const content = data.choices[0].message.content;

            let diagramData;
            try {
                diagramData = JSON.parse(content);
            } catch (e) {
                // Sometimes local models wrap in ```json
                const cleaned = content.replace(/```json\n ?/g, '').replace(/```\n?/g, '').trim();
                diagramData = JSON.parse(cleaned);
            }

            // If "diagram" wrapper is present in JSON (sometimes models do this despite prompt), unwrap it
            if (diagramData.diagram && !diagramData.components) {
                diagramData = diagramData.diagram;
            }

            groqLimiter.recordRequest(keyIndex, modelName);

            return {
                diagram: diagramData,
                diagnostics: { keyId: keyIndex + 1, model: modelName, provider: 'groq' }
            };

        } catch (err) {
            lastError = err;
            console.error(`[Groq Service] Error:`, err);
            // If it wasn't a 429 caught above, we might still want to try next key if it's a network error
            if (err.message.includes('fetch') || err.message.includes('network')) {
                continue;
            }
            // For other logic errors, maybe stop? But safer to try next combo
            continue;
        }
    }
    throw new Error(`Groq generation failed after multiple attempts. Last error: ${lastError?.message}`);
}

/**
 * Generates an architecture diagram for the given description
 * @param {string} systemDescription 
 * @param {string} promptInstructions Optional custom instructions
 * @param {string} provider 'gemini' | 'groq'
 * @returns {Promise<object>}
 */
/**
 * Generates an architecture diagram for the given description
 * @param {string} systemDescription 
 * @param {string} promptInstructions Optional custom instructions
 * @param {string} provider 'gemini' | 'groq'
 * @param {string} cloudProvider 'auto' | 'aws' | 'azure' | 'gcp' | 'none'
 * @returns {Promise<object>}
 */
export const generateDiagram = async (systemDescription, promptInstructions = '', provider = 'gemini', cloudProvider = 'auto') => {
    if (!systemDescription) {
        throw new Error('System description is required');
    }

    // cache key includes provider to avoid mixing different model qualities
    const cacheKey = `${provider}:${cloudProvider}:${systemDescription}`;
    const cached = getCachedDiagram(cacheKey);

    if (cached) {
        return {
            success: true,
            diagram: cached,
            fromCache: true,
            timestamp: Math.floor(Date.now() / 1000),
            cacheInfo: { hit: true, expiresIn: "4 hours" }
        };
    }

    // ✅ Inject Cloud Provider Specific Instructions
    const cloudInstructions = {
        'aws': `
        Analyze the system description and detect cloud services. For each cloud component:
        
        AWS Services (use exact names):
        - Compute: Lambda, EC2, ECS, EKS, Fargate, Elastic Beanstalk
        - Storage: S3, EBS, EFS, Glacier
        - Database: DynamoDB, RDS, Aurora, ElastiCache, Redshift, DocumentDB
        - Networking: API Gateway, CloudFront, Route53, VPC, ELB
        - Messaging: SQS, SNS, Kinesis, EventBridge
        - Analytics: Athena, EMR, Glue, QuickSight
        - ML: SageMaker, Rekognition, Comprehend
        - Security: IAM, Cognito, Secrets Manager, KMS, WAF
        - DevOps: CodePipeline, CodeBuild, CodeDeploy
        - Monitoring: CloudWatch, CloudFormation, CloudTrail
        
        Add these fields to components:
        - "cloudProvider": "aws"
        - "cloudService": exact service name from list above (e.g. "Lambda", "S3")
        `,

        'azure': `
        Analyze the system description and detect cloud services. For each cloud component:
        
        Azure Services (use exact names):
        - Compute: Virtual Machines, App Service, Functions, Container Instances, AKS
        - Storage: Blob Storage, Files, Queue Storage, Table Storage
        - Database: Cosmos DB, SQL Database, Database for MySQL, Database for PostgreSQL, Cache for Redis
        - Networking: Virtual Network, Load Balancer, Application Gateway, CDN, Front Door
        - Integration: Service Bus, Event Grid, Event Hubs, Logic Apps, API Management
        - Analytics: Stream Analytics, Data Factory, Databricks, Synapse Analytics
        - AI/ML: Cognitive Services, Machine Learning, Bot Service
        - Security: Active Directory, Key Vault, Security Center
        - DevOps: Azure DevOps, Pipelines
        - Monitoring: Monitor, Application Insights
        
        Add these fields to components:
        - "cloudProvider": "azure"
        - "cloudService": exact service name from list above (e.g. "Functions", "Cosmos DB")
        `,

        'gcp': `
        Analyze the system description and detect cloud services. For each cloud component:
        
        GCP Services (use exact names):
        - Compute: Compute Engine, App Engine, Cloud Run, Cloud Functions, GKE
        - Storage: Cloud Storage, Persistent Disk, Filestore
        - Database: Cloud SQL, Cloud Spanner, Firestore, Bigtable, Memorystore
        - Networking: Cloud CDN, Cloud Load Balancing, VPC, Cloud DNS
        - Analytics: BigQuery, Dataflow, Dataproc, Pub/Sub
        - AI/ML: Vertex AI, AutoML, Vision API, Natural Language
        - Security: Cloud IAM, Secret Manager, KMS
        - DevOps: Cloud Build, Artifact Registry
        - Monitoring: Cloud Monitoring, Cloud Logging
        
        Add these fields to components:
        - "cloudProvider": "gcp"
        - "cloudService": exact service name from list above (e.g. "Cloud Run", "BigQuery")
        `,

        'auto': `
        Analyze the system description to infer the preferred cloud provider.
        If specific services (e.g., "S3", "Cosmos", "Pub/Sub") are mentioned, use that provider.
        If generic terms are used, map them to the best matching service from AWS, Azure, or GCP.
        
        Explicitly set:
        - "cloudProvider": "aws" | "azure" | "gcp"
        - "cloudService": The specific service name (use standard names like "Lambda", "S3", "Functions")
        `
    };

    let selectedInstructions = cloudInstructions[cloudProvider] || cloudInstructions['auto'];
    if (cloudProvider === 'none') selectedInstructions = "";


    const fullInstructions = `${promptInstructions}\n\n${selectedInstructions}`;

    let result;
    if (provider === 'groq') {
        result = await generateWithGroq(systemDescription, fullInstructions);
    } else {
        result = await generateWithGemini(systemDescription, fullInstructions);
    }

    setCachedDiagram(cacheKey, result.diagram);
    // Also set old key format for backward compatibility if needed? No, better to segregate.

    return {
        success: true,
        ...result,
        fromCache: false,
        timestamp: Math.floor(Date.now() / 1000),
        cacheInfo: { hit: false }
    };
};
