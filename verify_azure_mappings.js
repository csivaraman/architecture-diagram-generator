
import { normalizeServiceName } from './src/utils/cloudIcons.js';
import { localIconMap } from './src/utils/localIconMap.js';

const checkAzureMappings = () => {
    const azureMap = localIconMap.azure;
    const issues = [];
    const unreachableKeys = [];

    console.log('Checking Azure mappings...');

    for (const key of Object.keys(azureMap)) {
        // Simulate user input: often just the service name, or "Azure [Service Name]"
        // normalizeServiceName strips "azure", so "Azure OpenAI" -> "openai"
        // We want to ensure that "openai" maps to "azure openai" (key) via aliases,
        // OR that the key itself is just "openai".

        // Test 1: Does the key, when normalized, return to itself?
        // If key is 'azure openai', normalized is 'openai'. 
        // If alias 'openai' -> 'azure openai' exists, then normalizeServiceName('azure openai') returns 'azure openai'.
        // Let's check what normalizeServiceName(key) returns.

        const normalizedKey = normalizeServiceName(key);

        if (normalizedKey !== key) {
            // If normalized key is different, it means the key as-is won't be matched 
            // if the user types exactly the key, UNLESS the user types something that normalizes to the key.
            // But typically, we want the key to be the "canonical" normalized form.

            // Let's see if we can reach this key by typing it without 'azure'.
            const keyWithoutPrefix = key.replace(/^azure\s+/, '');
            const normalizedWithoutPrefix = normalizeServiceName(keyWithoutPrefix);

            if (normalizedWithoutPrefix !== key) {
                issues.push({
                    key,
                    normalized: normalizedKey,
                    normalizedWithoutPrefix
                });
                unreachableKeys.push(key);
            }
        }
    }


    console.log(`Found ${issues.length} potentially unreachable Azure keys.`);
    if (issues.length > 0) {
        console.log('        // Azure Aliases (Generated)');
        // Generate aliases: normalized -> key
        const suggestions = issues.map(i => `        '${i.normalized}': '${i.key}',`);
        console.log(suggestions.join('\n'));
    }
};

checkAzureMappings();
