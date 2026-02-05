import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import RateLimiter from '../RateLimiter';

describe('RateLimiter', () => {
    let rateLimiter;
    const mockApiKeys = ['key1', 'key2', 'key3'];

    beforeEach(() => {
        // Clear localStorage before each test
        localStorage.clear();
        vi.useFakeTimers();
        rateLimiter = new RateLimiter(mockApiKeys);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should initialize with provided API keys', () => {
        expect(rateLimiter.apiKeys).toEqual(mockApiKeys);
        expect(rateLimiter.currentKeyIndex).toBe(0);
    });

    it('should load stats from localStorage on initialization', () => {
        const savedData = {
            usage: {
                0: { 'gemini-2.5-flash-lite': { requestCount: 5, dailyCount: 10 } }
            },
            lastSave: Date.now()
        };
        localStorage.setItem('gemini_rate_limiter_v1', JSON.stringify(savedData));

        const newLimiter = new RateLimiter(mockApiKeys);
        expect(newLimiter.usage[0]['gemini-2.5-flash-lite'].requestCount).toBe(5);
    });

    it('should return a valid key and model when available', async () => {
        const result = await rateLimiter.getKeyAndModel(100);
        expect(result).not.toBeNull();
        expect(result.keyIndex).toBeGreaterThanOrEqual(0);
        expect(result.keyIndex).toBeLessThan(mockApiKeys.length);
        expect(result.model).toBeDefined();
    });

    it('should rotate keys when one is exhausted', async () => {
        // Artificially exhaust key 0 for all models
        rateLimiter.models['gemini-2.5-flash-lite'].rpd = 1;
        rateLimiter.recordRequest(0, 'gemini-2.5-flash-lite', 100);
        rateLimiter.recordRequest(0, 'gemini-2.5-flash-lite', 100);

        // Manually trigger quota exceeded to be sure
        rateLimiter.reportQuotaExceeded(0, 'gemini-2.5-flash-lite');

        const result = await rateLimiter.getKeyAndModel(100);

        Object.keys(rateLimiter.models).forEach(model => {
            rateLimiter.reportQuotaExceeded(0, model);
        });

        const nextResult = await rateLimiter.getKeyAndModel(100);
        expect(nextResult.keyIndex).not.toBe(0);
    });

    it('should save stats to localStorage when usage changes', () => {
        rateLimiter.recordRequest(0, 'gemini-2.5-flash-lite', 100);
        const stored = localStorage.getItem('gemini_rate_limiter_v1');
        expect(stored).not.toBeNull();
        const parsed = JSON.parse(stored);
        expect(parsed.usage[0]['gemini-2.5-flash-lite'].requestCount).toBeGreaterThan(0);
    });

    it('should reset counters periodically (simulated)', () => {
        // Use a fixed start time (e.g., Jan 1st 2024 noon UTC)
        const START_TIME = new Date('2024-01-01T12:00:00Z').getTime();

        vi.setSystemTime(START_TIME);

        // Re-init to set lastResetDay based on START_TIME
        rateLimiter = new RateLimiter(mockApiKeys);

        rateLimiter.recordRequest(0, 'gemini-2.5-flash-lite', 100);

        // Advance time by 25 hours (to ensure day boundary cross)
        const TOMORROW = START_TIME + 25 * 60 * 60 * 1000;
        vi.setSystemTime(TOMORROW);

        // Trigger reset check
        rateLimiter.resetCountersIfNeeded(0, 'gemini-2.5-flash-lite');

        expect(rateLimiter.usage[0]['gemini-2.5-flash-lite'].dailyCount).toBe(0);
    });
});
