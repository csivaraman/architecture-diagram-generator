// TestRunner.js - Add this as a new file in your components folder

import React, { useState } from 'react';
import architectureTestCases from '../data/architectureTestCases';

function TestRunner({ generateDiagram }) {  // Your existing diagram generation function
    const [currentTestIndex, setCurrentTestIndex] = useState(0);
    const [isRunning, setIsRunning] = useState(false);
    const [results, setResults] = useState([]);

    const [testLimit, setTestLimit] = useState(1);

    const runTests = async () => {
        setIsRunning(true);
        setResults([]);

        const testsToRun = architectureTestCases.slice(0, testLimit);

        for (let i = 0; i < testsToRun.length; i++) {
            const testCase = testsToRun[i];
            setCurrentTestIndex(i);

            try {
                console.log(`Running test ${i + 1}/${testsToRun.length}: ${testCase.name}`);

                // Call YOUR EXISTING diagram generation function
                await generateDiagram(testCase.description);

                // Record success
                setResults(prev => [...prev, {
                    id: testCase.id,
                    name: testCase.name,
                    status: 'passed',
                    timestamp: new Date().toISOString()
                }]);

                // Wait 2 seconds between tests to respect rate limits
                if (i < testsToRun.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }

            } catch (error) {
                console.error(`Test ${testCase.id} failed:`, error);

                // Record failure
                setResults(prev => [...prev, {
                    id: testCase.id,
                    name: testCase.name,
                    status: 'failed',
                    error: error.message,
                    timestamp: new Date().toISOString()
                }]);
            }
        }

        setIsRunning(false);
    };

    const passedCount = results.filter(r => r.status === 'passed').length;
    const failedCount = results.filter(r => r.status === 'failed').length;

    return (
        <div className="test-runner">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2>Architecture Test Suite</h2>
                <div className="test-controls" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        Run first:
                        <select
                            value={testLimit}
                            onChange={(e) => setTestLimit(parseInt(e.target.value))}
                            style={{ width: '80px', padding: '5px', borderRadius: '8px', border: '1px solid #ccc' }}
                            disabled={isRunning}
                        >
                            {[...Array(architectureTestCases.length)].map((_, i) => (
                                <option key={i + 1} value={i + 1}>
                                    {i + 1}
                                </option>
                            ))}
                        </select>
                        cases
                    </label>
                    <button
                        onClick={runTests}
                        disabled={isRunning}
                        className="btn-secondary"
                        style={{ padding: '0.75rem 1.5rem', fontSize: '1rem', fontWeight: 600, color: '#667eea', background: 'white', border: '2px solid #667eea', borderRadius: '12px', cursor: isRunning ? 'not-allowed' : 'pointer', transition: 'all 0.2s', opacity: isRunning ? 0.7 : 1 }}
                        onMouseOver={(e) => !isRunning && (e.target.style.background = '#f3f4f6')}
                        onMouseOut={(e) => e.target.style.background = 'white'}
                    >
                        {isRunning ? 'Running Tests...' : 'Run Tests'}
                    </button>
                </div>
            </div>

            {isRunning && (
                <div className="test-progress">
                    <p>Running test {currentTestIndex + 1} / {testLimit}</p>
                    <p>{architectureTestCases[currentTestIndex]?.name}</p>
                </div>
            )}

            {results.length > 0 && (
                <div className="test-results">
                    <h3>Results: {passedCount} passed, {failedCount} failed</h3>
                    <div className="results-list">
                        {results.map(result => (
                            <div
                                key={result.id}
                                className={`result-item ${result.status}`}
                                style={{ display: 'flex', gap: '15px', padding: '4px 12px', alignItems: 'center', marginBottom: '2px', borderRadius: '8px' }}
                            >
                                <span style={{ fontSize: '1.2rem' }}>{result.status === 'passed' ? '✅' : '❌'}</span>
                                <span style={{ fontWeight: '700', minWidth: '60px', color: '#4b5563' }}>{result.id}</span>
                                <span style={{ fontWeight: '500' }}>{result.name}</span>
                                {result.error && <span style={{ marginLeft: 'auto', color: '#dc2626', fontSize: '0.85rem', background: 'white', padding: '2px 8px', borderRadius: '4px' }}>Error: {result.error}</span>}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export default TestRunner;