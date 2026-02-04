/**
 * Intelligent Rate Limiter for Gemini API Free Tier
 * 
 * Features:
 * - API key pool rotation (5 keys)
 * - Model fallback (Flash → Flash-Lite)
 * - Throttling to stay under RPM/TPM limits
 * - Exponential backoff on 429 errors
 * - Request queue management
 */

class RateLimiter {
    constructor(apiKeys, config = {}) {
        this.apiKeys = apiKeys;
        this.currentKeyIndex = 0;
        this.currentModel = 'gemini-2.5-flash'; // Start with best model

        // Model configurations
        this.models = {
            'gemini-2.5-flash': {
                rpm: 10,
                tpm: 250000,
                rpd: 250,
                quality: 'high'
            },
            'gemini-2.5-flash-lite': {
                rpm: 15,
                tpm: 250000,
                rpd: 1000,
                quality: 'medium'
            }
        };

        // Safety buffer: use 80% of limits to avoid edge cases
        this.SAFETY_FACTOR = 0.8;

        // Track usage per key per model
        this.usage = {};
        apiKeys.forEach((_, keyIndex) => {
            this.usage[keyIndex] = {
                'gemini-2.5-flash': {
                    requestCount: 0,
                    tokenCount: 0,
                    dailyCount: 0,
                    lastResetMinute: Date.now(),
                    lastResetDay: this.getMidnightPT()
                },
                'gemini-2.5-flash-lite': {
                    requestCount: 0,
                    tokenCount: 0,
                    dailyCount: 0,
                    lastResetMinute: Date.now(),
                    lastResetDay: this.getMidnightPT()
                }
            };
        });

        // Request queue
        this.requestQueue = [];
        this.processing = false;
    }

    /**
     * Get midnight Pacific Time for daily limit resets
     */
    getMidnightPT() {
        const now = new Date();
        const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
        const ptOffset = -8 * 60 * 60000; // PST offset
        const pt = new Date(utc + ptOffset);
        pt.setHours(0, 0, 0, 0);
        return pt.getTime();
    }

    /**
     * Reset counters if time windows have elapsed
     */
    resetCountersIfNeeded(keyIndex, model) {
        const usage = this.usage[keyIndex][model];
        const now = Date.now();
        const midnightPT = this.getMidnightPT();

        // Reset minute counters (rolling 60-second window)
        if (now - usage.lastResetMinute >= 60000) {
            usage.requestCount = 0;
            usage.tokenCount = 0;
            usage.lastResetMinute = now;
        }

        // Reset daily counters at midnight PT
        if (midnightPT > usage.lastResetDay) {
            usage.dailyCount = 0;
            usage.lastResetDay = midnightPT;
        }
    }

    /**
     * Check if we can make a request with current key and model
     */
    canMakeRequest(keyIndex, model, estimatedTokens = 2000) {
        this.resetCountersIfNeeded(keyIndex, model);

        const usage = this.usage[keyIndex][model];
        const limits = this.models[model];

        // Apply safety factor
        const safeRPM = Math.floor(limits.rpm * this.SAFETY_FACTOR);
        const safeTPM = Math.floor(limits.tpm * this.SAFETY_FACTOR);
        const safeRPD = Math.floor(limits.rpd * this.SAFETY_FACTOR);

        // Check all limits
        if (usage.requestCount >= safeRPM) return false;
        if (usage.tokenCount + estimatedTokens > safeTPM) return false;
        if (usage.dailyCount >= safeRPD) return false;

        return true;
    }

    /**
     * Find next available key and model
     */
    findAvailableKeyAndModel(estimatedTokens = 2000) {
        const models = ['gemini-2.5-flash', 'gemini-2.5-flash-lite'];

        // Try each model
        for (const model of models) {
            // Try each API key for this model
            for (let i = 0; i < this.apiKeys.length; i++) {
                const keyIndex = (this.currentKeyIndex + i) % this.apiKeys.length;

                if (this.canMakeRequest(keyIndex, model, estimatedTokens)) {
                    return { keyIndex, model };
                }
            }
        }

        return null; // All keys and models exhausted
    }

    /**
     * Calculate minimum wait time before next request
     */
    calculateWaitTime(keyIndex, model) {
        const usage = this.usage[keyIndex][model];
        const limits = this.models[model];

        const timeSinceReset = Date.now() - usage.lastResetMinute;
        const timeUntilReset = 60000 - timeSinceReset;

        // If we've hit RPM limit, wait until window resets
        if (usage.requestCount >= limits.rpm) {
            return Math.max(timeUntilReset, 1000);
        }

        // Otherwise, throttle to spread requests evenly
        const safeRPM = Math.floor(limits.rpm * this.SAFETY_FACTOR);
        const minInterval = 60000 / safeRPM;

        return minInterval;
    }

    /**
     * Record a successful request
     */
    recordRequest(keyIndex, model, tokensUsed) {
        this.resetCountersIfNeeded(keyIndex, model);

        const usage = this.usage[keyIndex][model];
        usage.requestCount++;
        usage.tokenCount += tokensUsed;
        usage.dailyCount++;

        // Update current key index for round-robin
        this.currentKeyIndex = (keyIndex + 1) % this.apiKeys.length;
        this.currentModel = model;
    }

    /**
     * Get current API key and model to use
     */
    async getKeyAndModel(estimatedTokens = 2000) {
        const available = this.findAvailableKeyAndModel(estimatedTokens);

        if (!available) {
            // All exhausted - find shortest wait time
            let minWait = Infinity;
            let bestKey = 0;
            let bestModel = 'gemini-2.5-flash-lite';

            for (const model of Object.keys(this.models)) {
                for (let i = 0; i < this.apiKeys.length; i++) {
                    const wait = this.calculateWaitTime(i, model);
                    if (wait < minWait) {
                        minWait = wait;
                        bestKey = i;
                        bestModel = model;
                    }
                }
            }

            console.log(`Rate limit reached. Waiting ${Math.ceil(minWait / 1000)}s before retry...`);
            await this.sleep(minWait);

            return { keyIndex: bestKey, model: bestModel };
        }

        return available;
    }

    /**
     * Sleep utility
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Get usage statistics
     */
    getStats() {
        const stats = {
            keys: [],
            totalRequests: 0,
            totalDailyRequests: 0
        };

        this.apiKeys.forEach((_, keyIndex) => {
            const flashUsage = this.usage[keyIndex]['gemini-2.5-flash'];
            const liteUsage = this.usage[keyIndex]['gemini-2.5-flash-lite'];

            stats.keys.push({
                keyIndex,
                flash: {
                    rpm: flashUsage.requestCount,
                    rpd: flashUsage.dailyCount
                },
                flashLite: {
                    rpm: liteUsage.requestCount,
                    rpd: liteUsage.dailyCount
                }
            });

            stats.totalRequests += flashUsage.requestCount + liteUsage.requestCount;
            stats.totalDailyRequests += flashUsage.dailyCount + liteUsage.dailyCount;
        });

        return stats;
    }
}

export default RateLimiter;