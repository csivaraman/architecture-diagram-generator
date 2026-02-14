import fs from 'fs';
import path from 'path';
import config from './e2e.config.js';

export class ReportGenerator {
    constructor() {
        this.results = [];
        this.startTime = Date.now();
    }

    addResult(result) {
        this.results.push(result);
    }

    generate() {
        const duration = (Date.now() - this.startTime) / 1000;
        const total = this.results.length;
        const passed = this.results.filter(r => r.success).length;
        const failed = total - passed;
        const cached = this.results.filter(r => r.cached).length;

        const html = `
<!DOCTYPE html>
<html>
<head>
    <title>E2E Test Report</title>
    <style>
        body { font-family: -apple-system, system-ui, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; }
        .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 30px; }
        .card { padding: 20px; border-radius: 8px; background: #f5f5f7; }
        .success { background: #e6fffa; color: #006b5f; }
        .failure { background: #fff5f5; color: #c53030; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #f5f5f7; }
        .badge { padding: 4px 8px; border-radius: 4px; font-size: 12px; }
        .badge-success { background: #c6f6d5; color: #22543d; }
        .badge-failure { background: #fed7d7; color: #822727; }
        .badge-cached { background: #bee3f8; color: #2a4365; }
    </style>
</head>
<body>
    <h1>Architecture Diagram Generator - E2E Test Report</h1>
    
    <div class="summary">
        <div class="card"><h3>Total Tests: ${total}</h3></div>
        <div class="card ${failed === 0 ? 'success' : 'failure'}"><h3>Passed: ${passed}</h3></div>
        <div class="card ${failed > 0 ? 'failure' : 'success'}"><h3>Failed: ${failed}</h3></div>
        <div class="card"><h3>Cached: ${cached}</h3></div>
    </div>
    
    <p>Duration: ${duration.toFixed(2)}s</p>

    <table>
        <thead>
            <tr>
                <th>Provider</th>
                <th>Cloud</th>
                <th>Status</th>
                <th>Latency</th>
                <th>Source</th>
                <th>Prompt</th>
                <th>Errors</th>
            </tr>
        </thead>
        <tbody>
            ${this.results.map(r => `
            <tr>
                <td>${r.provider}</td>
                <td>${r.cloudProvider}</td>
                <td><span class="badge ${r.success ? 'badge-success' : 'badge-failure'}">${r.success ? 'PASS' : 'FAIL'}</span></td>
                <td>${r.latency}ms</td>
                <td><span class="badge ${r.cached ? 'badge-cached' : ''}">${r.cached ? 'CACHE' : 'API'}</span></td>
                <td title="${r.prompt}">${r.prompt.substring(0, 50)}...</td>
                <td>${r.errors.join(', ')}</td>
            </tr>
            `).join('')}
        </tbody>
    </table>
</body>
</html>`;

        if (!fs.existsSync(config.reportDir)) {
            fs.mkdirSync(config.reportDir, { recursive: true });
        }

        fs.writeFileSync(path.join(config.reportDir, 'e2e-report.html'), html);
        console.log(`Report generated at ${path.join(config.reportDir, 'e2e-report.html')}`);
    }
}

export default new ReportGenerator();
