import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import config from './e2e.config.js';
import { e2eTestPrompts } from '../fixtures/e2eTestPrompts.js';
import cacheManager from './cache-manager.js';
import { validators } from './validators.js';
import reportGenerator from './report-generator.js';
import { layoutDiagram } from '../../utils/diagramLayout.js';

// Shuffle and select random prompts
const selectRandomPrompts = (prompts, count) => {
    const shuffled = [...prompts].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
};

const specificPrompt = 'Design a multi-cloud architecture with AWS S3 for primary storage, Azure Blob Storage for backup and disaster recovery, GCP BigQuery for analytics, AWS Lambda for data transformation, Azure Functions for replication logic, and GCP Cloud Monitoring for unified observability across clouds.';
const selectedPrompts = [specificPrompt];

describe('E2E Diagram Generation Tests', () => {
    // Generate test matrix: 25 prompts * 2 providers * 3 clouds = 150 tests
    const testMatrix = [];
    selectedPrompts.forEach(prompt => {
        config.providers.forEach(provider => {
            config.cloudProviders.forEach(cloudProvider => {
                testMatrix.push({ prompt, provider, cloudProvider });
            });
        });
    });

    console.log(`Running ${testMatrix.length} E2E tests across ${config.providers.join(', ')} and ${config.cloudProviders.join(', ')}`);

    // Helper to simulate delay
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    // Helper to make API call with retries
    const fetchDiagram = async (prompt, provider, cloudProvider) => {
        let attempts = 0;
        while (attempts < config.retryAttempts) {
            try {
                const response = await fetch(config.apiEndpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        systemDescription: prompt,
                        provider,
                        cloudProvider
                    })
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
                }
                return await response.json();
            } catch (error) {
                attempts++;
                if (attempts >= config.retryAttempts) throw error;
                await delay(config.retryDelay);
            }
        }
    };

    afterAll(() => {
        reportGenerator.generate();
    });

    // Run tests sequentially
    testMatrix.forEach(({ prompt, provider, cloudProvider }) => {
        const testName = `[${provider.toUpperCase()}] [${cloudProvider.toUpperCase()}] ${prompt.substring(0, 40)}...`;

        it(testName, async () => {
            const startTime = Date.now();
            let response;
            let fromCache = false;
            const errors = [];

            // Check Cache
            const cachedData = cacheManager.get(prompt, provider, cloudProvider);

            // Should verify process.argv for --no-cache flag, but simplified for Vitest context
            const noCache = process.env.NO_CACHE === 'true';

            if (cachedData && !noCache) {
                response = cachedData.response;
                fromCache = true;
                // Add simulated latency for report consistency
            } else {
                try {
                    response = await fetchDiagram(prompt, provider, cloudProvider);
                    if (response) {
                        cacheManager.set(prompt, provider, cloudProvider, response);
                    }
                } catch (error) {
                    errors.push(`API Error: ${error.message}`);
                }
            }

            const latency = Date.now() - startTime;

            // Validation
            if (response && response.diagram) {
                const diagramData = response.diagram;
                errors.push(...validators.validateStructure(diagramData));
                if (diagramData.components) {
                    errors.push(...validators.validateCloudIcons(diagramData, cloudProvider));
                }

                // Simulate layout to check for overlaps
                try {
                    const laidOut = layoutDiagram(diagramData, diagramData.systemName, { isMobile: false, isTablet: false });
                    errors.push(...validators.validateLayout(laidOut));
                } catch (layoutErr) {
                    errors.push(`Layout simulation failed: ${layoutErr.message}`);
                }

                // Only validate latency for non-cached responses
                if (!fromCache) {
                    errors.push(...validators.validatePerformance(latency, provider));
                }
            } else if (!errors.length) {
                errors.push('No diagram data received in response');
            }

            // Report Result
            reportGenerator.addResult({
                prompt,
                provider,
                cloudProvider,
                success: errors.length === 0,
                errors,
                latency: fromCache ? 0 : latency,
                cached: fromCache
            });

            if (errors.length > 0) {
                console.error(`[FAIL] ${testName}:`, JSON.stringify(errors, null, 2));
            }

            // Assertions
            expect(errors).toHaveLength(0);
        }, config.timeout);
    });
});
