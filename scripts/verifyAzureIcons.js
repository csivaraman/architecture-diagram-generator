
import { getCloudIcon } from '../src/utils/cloudIcons.js';

const testCases = [
    { provider: 'azure', service: 'Azure Bot Service' },
    { provider: 'azure', service: 'Bot Service' },
    { provider: 'azure', service: 'Azure API Management' },
    { provider: 'azure', service: 'API Management' },
    { provider: 'azure', service: 'Cosmos DB' },
    { provider: 'azure', service: 'Azure Cosmos DB' },
    { provider: 'azure', service: 'Blob Storage' },
    { provider: 'azure', service: 'Azure Functions' },
    { provider: 'azure', service: 'Functions' },
    { provider: 'azure', service: 'Logic Apps' },
    { provider: 'azure', service: 'Service Bus' }
];

console.log('Verifying Azure Icon Mapping...');
testCases.forEach(({ provider, service }) => {
    const iconPath = getCloudIcon(provider, service);
    const status = iconPath && iconPath.startsWith('/cloud-icons') ? '✅ Found' : '❌ Missing';
    console.log(`${service.padEnd(25)} -> ${status} (${iconPath})`);
});
