import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import config from './e2e.config.js';

class CacheManager {
    constructor() {
        this.cacheDir = path.resolve(config.cacheDir);
        this.ensureCacheDir();
    }

    ensureCacheDir() {
        if (!fs.existsSync(this.cacheDir)) {
            fs.mkdirSync(this.cacheDir, { recursive: true });
        }
    }

    getHash(prompt, provider, cloudProvider) {
        return crypto
            .createHash('md5')
            .update(`${prompt}-${provider}-${cloudProvider}`)
            .digest('hex');
    }

    getCacheFilePath(prompt, provider, cloudProvider) {
        const hash = this.getHash(prompt, provider, cloudProvider);
        return path.join(this.cacheDir, `${provider}_${cloudProvider}_${hash}.json`);
    }

    get(prompt, provider, cloudProvider) {
        const filePath = this.getCacheFilePath(prompt, provider, cloudProvider);

        if (!fs.existsSync(filePath)) {
            return null;
        }

        try {
            const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
            const age = Date.now() - data.timestamp;

            if (age > config.cacheMaxAge) {
                return null;
            }

            return data;
        } catch (error) {
            console.error(`Error reading cache file ${filePath}:`, error);
            return null;
        }
    }

    set(prompt, provider, cloudProvider, response, metadata = {}) {
        const filePath = this.getCacheFilePath(prompt, provider, cloudProvider);
        const data = {
            prompt,
            provider,
            cloudProvider,
            timestamp: Date.now(),
            response,
            metadata
        };

        try {
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        } catch (error) {
            console.error(`Error writing cache file ${filePath}:`, error);
        }
    }

    clear() {
        if (fs.existsSync(this.cacheDir)) {
            fs.rmSync(this.cacheDir, { recursive: true, force: true });
            this.ensureCacheDir();
        }
    }
}

export default new CacheManager();
