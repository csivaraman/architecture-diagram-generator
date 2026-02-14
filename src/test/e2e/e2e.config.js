export default {
    testCount: 1,
    providers: ['gemini', 'groq'],
    cloudProviders: ['none', 'aws', 'azure', 'gcp'],
    cacheDir: './src/test/cache/api-responses',
    reportDir: './src/test/reports',
    cacheMaxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    batchSize: 5, // Process 5 tests at a time
    batchDelay: 2000, // 2 second delay between batches
    timeout: 300000, // 5 minutes timeout per test
    retryAttempts: 3,
    retryDelay: 5000,
    apiEndpoint: 'http://localhost:3001/api/generate-diagram' // Assuming backend runs on 3001
};
