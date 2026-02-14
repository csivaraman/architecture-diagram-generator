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
                'gemini-3-flash-preview',
                'gemini-2.5-flash-lite',
                'gemini-2.0-flash-lite',
                'gemini-flash-lite-latest',
                'gemini-2.5-flash',
                'gemini-1.5-flash',
                'gemini-1.5-pro'
            ];

            // Model configurations
            this.models = {
                'gemini-3-flash-preview': { rpm: 10, tpm: 250000, rpd: 20, quality: 'high' },
                'gemini-2.5-flash-lite': { rpm: 15, tpm: 250000, rpd: 20, quality: 'medium' },
                'gemini-2.0-flash-lite': { rpm: 15, tpm: 250000, rpd: 20, quality: 'medium' },
                'gemini-flash-lite-latest': { rpm: 15, tpm: 250000, rpd: 20, quality: 'medium' },
                'gemini-2.5-flash': { rpm: 10, tpm: 250000, rpd: 20, quality: 'high' },
                'gemini-1.5-flash': { rpm: 15, tpm: 1000000, rpd: 1500, quality: 'high' },
                'gemini-1.5-pro': { rpm: 2, tpm: 32000, rpd: 50, quality: 'ultra' }
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

    getStats() {
        return this.usage;
    }
}

export default RateLimiter;
