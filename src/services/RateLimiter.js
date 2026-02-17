import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));



/**
 * Intelligent Rate Limiter for Gemini API Free Tier (Node.js Version)
 */
class RateLimiter {
    constructor(apiKeys, modelConfig = null, storageFilename = 'rate_limiter_stats.json') {
        this.apiKeys = apiKeys;
        this.currentKeyIndex = 0;
        this.storagePath = path.join(__dirname, `../../${storageFilename}`);

        if (modelConfig) {
            this.modelPriority = modelConfig.priority;
            this.models = modelConfig.models;
        } else {
            // Priority order for models
            this.modelPriority = [
                // Tier 1: Best available (fresh + excellent limits)
                'gemini-2.0-flash-lite',      // #1: 15 RPM, Unlimited, 1500 RPD (BEST)

                // Tier 2: Good capacity remaining
                'gemini-2.5-flash-lite',      // #2: 10 RPM , 250K, 20 RPD 

                // Tier 3: Good quality but currently exhausted (will reset at midnight PT)
                'gemini-3-flash',             // #3: 5 RPM, 250K, 20 RPD

                // Tier 4: Experimental but excellent limits
                'gemini-2.0-flash-exp',       // #4: 15 RPM, Unlimited, 1500 RPD

                // Tier 5: Stable balanced option
                'gemini-2.0-flash',           // #5: 15 RPM, Unlimited, 1500 RPD

                // Tier 6: Higher quality fallback
                'gemini-2.5-flash'            // #6: 5 RPM, 250K, 20 RPD
            ];

            // Model configurations
            this.models = {
                'gemini-2.0-flash-lite': {
                    rpm: 15,
                    tpm: 999999999,   // Unlimited (represented as large number)
                    rpd: 1500,
                    quality: 'medium',
                    avgLatency: 3000,
                    maxLatency: 8000
                },

                'gemini-2.5-flash-lite': {
                    rpm: 10,
                    tpm: 250000,
                    rpd: 20,
                    quality: 'medium',
                    avgLatency: 3500,
                    maxLatency: 9000
                },

                'gemini-3-flash': {
                    rpm: 5,            // Your actual limit
                    tpm: 250000,       // Your actual limit
                    rpd: 20,           // Your actual limit (currently 23/20, will reset)
                    quality: 'high',   // Gemini 3 has good quality
                    avgLatency: 4000,
                    maxLatency: 10000
                },

                'gemini-2.0-flash-exp': {
                    rpm: 15,
                    tpm: 999999999,
                    rpd: 1500,
                    quality: 'medium',
                    avgLatency: 4000,
                    maxLatency: 10000
                },

                'gemini-2.0-flash': {
                    rpm: 15,
                    tpm: 999999999,
                    rpd: 1500,
                    quality: 'high',
                    avgLatency: 4500,
                    maxLatency: 11000
                },

                'gemini-2.5-flash': {
                    rpm: 5,
                    tpm: 250000,
                    rpd: 20,
                    quality: 'high',
                    avgLatency: 5500,
                    maxLatency: 13000
                }
            };
        }

        this.SAFETY_FACTOR = 0.8;
        this.usage = {};

        // Initialize default usage
        apiKeys.forEach((_, keyIndex) => {
            if (!this.usage[keyIndex]) {
                this.usage[keyIndex] = {};
            }
            Object.keys(this.models).forEach(model => {
                this.usage[keyIndex][model] = {
                    requestCount: 0,
                    tokenCount: 0,
                    dailyCount: 0,
                    lastResetMinute: Date.now(),
                    lastResetDay: this.getMidnightPT()
                };
            });
        });

        this._load();
    }

    _load() {
        try {
            if (fs.existsSync(this.storagePath)) {
                const data = JSON.parse(fs.readFileSync(this.storagePath, 'utf8'));
                if (data.usage) {
                    // Restore usage if keys align, merging with defaults
                    this.apiKeys.forEach((_, index) => {
                        if (data.usage[index]) {
                            // Merge restored usage into current usage to preserve structure for new models
                            this.usage[index] = { ...this.usage[index], ...data.usage[index] };
                        }
                    });
                }
            }
        } catch (e) {
            console.error('[RateLimiter] Failed to load stats:', e.message);
        }
    }

    _save() {
        try {
            const data = {
                usage: this.usage,
                lastSave: Date.now()
            };
            // Note: In Vercel serverless functions, this may fail due to read-only FS.
            // We catch it so the function doesn't crash.
            if (process.env.VERCEL) {
                // Skip file persistence on Vercel to avoid error noise, 
                // as it won't persist across cold starts anyway.
                return;
            }
            fs.writeFileSync(this.storagePath, JSON.stringify(data, null, 2));
        } catch (e) {
            // Silently fail if FS is read-only
        }
    }

    getMidnightPT() {
        const now = new Date();
        const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
        const ptOffset = -8 * 60 * 60000; // PST offset
        const pt = new Date(utc + ptOffset);
        pt.setHours(0, 0, 0, 0);
        return pt.getTime();
    }

    resetCountersIfNeeded(keyIndex, model) {
        if (!this.usage[keyIndex] || !this.usage[keyIndex][model]) return; // Guard
        const usage = this.usage[keyIndex][model];
        const now = Date.now();
        const midnightPT = this.getMidnightPT();
        let changed = false;

        if (now - usage.lastResetMinute >= 60000) {
            usage.requestCount = 0;
            usage.tokenCount = 0;
            usage.lastResetMinute = now;
            changed = true;
        }

        if (midnightPT > usage.lastResetDay) {
            usage.dailyCount = 0;
            usage.lastResetDay = midnightPT;
            changed = true;
        }

        if (changed) this._save();
    }

    canMakeRequest(keyIndex, model, estimatedTokens = 2000) {
        this.resetCountersIfNeeded(keyIndex, model);
        // Guard against missing model in usage (if config changed)
        if (!this.usage[keyIndex] || !this.usage[keyIndex][model]) return false;

        const usage = this.usage[keyIndex][model];
        const limits = this.models[model];

        // Handle null/undefined estimatedTokens by enforcing default
        const tokens = estimatedTokens || 2000;

        const safeRPM = Math.floor(limits.rpm * this.SAFETY_FACTOR);
        const safeTPM = Math.floor(limits.tpm * this.SAFETY_FACTOR);
        const safeRPD = Math.floor(limits.rpd * this.SAFETY_FACTOR);

        if (usage.requestCount >= safeRPM) return false;
        if (usage.tokenCount + tokens > safeTPM) return false;
        if (usage.dailyCount >= safeRPD) return false;

        return true;
    }

    findAvailableKeyAndModel(estimatedTokens = 2000) {
        for (const model of this.modelPriority) {
            for (let i = 0; i < this.apiKeys.length; i++) {
                const keyIndex = (this.currentKeyIndex + i) % this.apiKeys.length;
                if (this.canMakeRequest(keyIndex, model, estimatedTokens)) {
                    return { keyIndex, model };
                }
            }
        }
        return null;
    }

    reportQuotaExceeded(keyIndex, model) {
        if (!this.usage[keyIndex] || !this.usage[keyIndex][model]) return;
        const usage = this.usage[keyIndex][model];
        const limits = this.models[model];
        usage.dailyCount = limits.rpd + 1; // Mark as exhausted
        console.log(`[RateLimiter] Reported quota exceeded for Key ${keyIndex + 1} on ${model}. Switching...`);
        this._save();
    }

    markModelUnavailable(model) {
        // Mark as exhausted for all keys if model is 404/unsupported
        this.apiKeys.forEach((_, idx) => {
            if (this.usage[idx] && this.usage[idx][model]) {
                const limits = this.models[model];
                this.usage[idx][model].dailyCount = limits.rpd + 1;
            }
        });
        this._save();
    }

    reportModelFailure(model) {
        // Mark current attempt as failed/exhausted to force rotation
        // The last used key is (currentKeyIndex - 1) because recordRequest increments it.
        // But here we are IN the loop, recordRequest hasn't been called yet?
        // Wait, recordRequest is called on success.
        // So currentIndex points to the NEXT eligible key *if* we loop?
        // Actually findAvailableKeyAndModel doesn't change currentKeyIndex.
        // So currentKeyIndex IS the one we just tried? 
        // No, findAvailableKeyAndModel iterates (current + i). 
        // We need the keyIndex that was actually used. 
        // But reportModelFailure doesn't have keyIndex argument in the user snippet!
        // We'll have to rely on `markModelUnavailable` logic but scoped to... well, without keyIndex we can't be precise.
        // Let's assume the user meant to pass keyIndex or we just penalize the model globally for a moment?
        // Or better, since we can't change the signature in the user's snippet, we just do a best effort.
        // Let's implement it to penalize the model for ALL keys for a short burst?
        // Or... wait. `diagram.js` HAS `keyIndex` in scope.
        // Maybe I should update diagram.js to PASS keyIndex?
        // The user snippet: `geminiLimiter.reportModelFailure(modelName);`
        // I should PROBABLY update the user's snippet to pass keyIndex if possible, OR
        // I'll implementation `reportModelFailure` to use `this.currentKeyIndex` which might be close enough?
        // `findAvailableKeyAndModel` does NOT update `this.currentKeyIndex`.
        // Only `recordRequest` updates it.
        // So `this.currentKeyIndex` is the starting point of the search.
        // The returned `keyIndex` from `findAvailableKeyAndModel` could be anything.
        // Without `keyIndex`, I can't know which key failed.
        // So I will just implement it as "mark unavailable for all keys" to be safe? 
        // No, that kills the model for everyone on a single 503.
        // I will change the method signature in `diagram.js` to pass keyIndex, and update it here too.

        // Actually, for now, I'll insert a placeholder that logs a warning about missing keyIndex if not provided,
        // but since I'm editing `diagram.js` anyway, I will FIX the call there.

        // Implementing with keyIndex argument support (optional)
    }

    // Rethinking: I'll implement `reportModelFailure` to take `keyIndex` and update `diagram.js` to pass it.

    reportModelFailure(model, keyIndex = -1) {
        if (keyIndex === -1) {
            // Fallback: penalize all?
            this.markModelUnavailable(model);
            return;
        }
        this.reportQuotaExceeded(keyIndex, model);
    }

    recordRequest(keyIndex, model, tokensUsed = 2000) {
        this.resetCountersIfNeeded(keyIndex, model);
        const usage = this.usage[keyIndex][model];
        usage.requestCount++;
        usage.tokenCount += tokensUsed;
        usage.dailyCount++;
        this.currentKeyIndex = (keyIndex + 1) % this.apiKeys.length;
        this._save();
    }

    async getKeyAndModel(estimatedTokens = 2000) {
        return this.findAvailableKeyAndModel(estimatedTokens);
    }

    getRecommendedModels() {
        return this.modelPriority;
    }

    getStats() {
        return this.usage;
    }

    get modelHealth() {
        // Evaluate health based on recent errors or availability
        // Since we don't track detailed error rates per model globally (only per key),
        // we'll aggregate availability. If a model is exhausted on ALL keys, it's "Unhealthy".
        const health = {};
        this.modelPriority.forEach(model => {
            let availableKeys = 0;
            let totalKeys = this.apiKeys.length;

            for (let i = 0; i < totalKeys; i++) {
                if (this.usage[i] && this.usage[i][model]) {
                    const usage = this.usage[i][model];
                    const limits = this.models[model];
                    // Check if daily limit reached
                    if (usage.dailyCount < limits.rpd) {
                        availableKeys++;
                    }
                }
            }

            health[model] = {
                status: availableKeys > 0 ? 'Operational' : 'Degraded',
                availableKeys: `${availableKeys}/${totalKeys}`,
                flagged: availableKeys === 0
            };
        });
        return health;
    }

    get performanceStats() {
        // Return static stats for now or derived if we had history.
        // User snippet expects an object.
        const stats = {};
        this.modelPriority.forEach(model => {
            const config = this.models[model];
            stats[model] = {
                avgLatency: config.avgLatency,
                p95Latency: config.maxLatency, // Approximation
                qualityScore: config.quality
            };
        });
        return stats;
    }
}

export default RateLimiter;
