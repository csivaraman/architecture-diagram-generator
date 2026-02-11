
const BASE_URL = 'http://localhost:3001/api/generate-diagram';

console.log('Testing Groq generation via API...');

async function runTest() {
    try {
        const response = await fetch(BASE_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                systemDescription: "Designed a microservices architecture for an e-commerce platform using Node.js, RabbitMQ, and PostgreSQL.",
                provider: "groq"
            })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            console.log('✅ TEST PASSED');
            console.log('Provider:', data.diagnostics?.provider);
            console.log('Model:', data.diagnostics?.model);
            console.log('Key ID:', data.diagnostics?.keyId);
            console.log('Diagram System Name:', data.diagram.systemName);
            console.log('Components Found:', data.diagram.components.length);
        } else {
            console.error('❌ TEST FAILED');
            console.error('Status:', response.status);
            console.error('Error:', data.error || JSON.stringify(data));
        }

    } catch (e) {
        console.error('❌ TEST FAILED (Exception):', e.message);
    }
}

runTest();
