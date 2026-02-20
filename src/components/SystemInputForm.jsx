import React from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { architectureTestCases } from '../data/architectureTestCases.js';

const SystemInputForm = ({
    description,
    setDescription,
    loading,
    provider,
    setProvider,
    onGenerate
}) => {
    const handleLoadExample = (e) => {
        const testCaseId = e.target.value;
        if (!testCaseId) return;

        const testCase = architectureTestCases.find(tc => tc.id === testCaseId);
        if (testCase) {
            setDescription(testCase.description);
        }
    };

    return (
        <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.95rem', fontWeight: 600, color: '#1f2937', marginBottom: '0.5rem' }}>
                System Description & Cloud Preference
            </label>
            <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your system architecture, components, technologies, and how they interact..."
                rows={6}
                style={{
                    width: '100%', padding: '1rem', fontSize: '1rem', border: '2px solid #e5e7eb',
                    borderRadius: '12px', transition: 'all 0.2s', outline: 'none', resize: 'vertical', fontFamily: 'inherit'
                }}
                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
            />

            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '1rem' }}>
                <button
                    onClick={onGenerate}
                    disabled={loading}
                    style={{
                        flex: 1, minWidth: '200px', padding: '1rem 2rem', fontSize: '1.1rem', fontWeight: 600,
                        color: 'white', background: loading ? '#9ca3af' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        border: 'none', borderRadius: '12px', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex',
                        alignItems: 'center', justifyContent: 'center', gap: '0.5rem', transition: 'all 0.2s',
                        boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)'
                    }}
                    onMouseOver={(e) => !loading && (e.target.style.transform = 'translateY(-2px)')}
                    onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
                >
                    {loading ? (
                        <>
                            <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
                            Generating with {provider === 'gemini' ? 'Gemini' : 'Groq Llama'}...
                        </>
                    ) : (
                        <>
                            <Sparkles size={20} />
                            Generate Diagram
                        </>
                    )}
                </button>

                <select
                    value={provider}
                    onChange={(e) => setProvider(e.target.value)}
                    disabled={loading}
                    style={{
                        padding: '1rem 1.5rem', fontSize: '1rem', fontWeight: 600, color: '#4b5563',
                        background: 'white', border: '2px solid #e5e7eb', borderRadius: '12px',
                        cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 0.2s', appearance: 'none',
                        textAlign: 'center', minWidth: '180px'
                    }}
                >
                    <option value="gemini">Google Gemini</option>
                    <option value="groq">Groq Llama</option>
                </select>

                <select
                    onChange={handleLoadExample}
                    disabled={loading}
                    className="load-example-select"
                    data-testid="load-example-select"
                    defaultValue=""
                    style={{
                        padding: '1rem 1.5rem', fontSize: '1rem', fontWeight: 600, color: '#667eea',
                        background: 'white', border: '2px solid #667eea', borderRadius: '12px',
                        cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 0.2s', appearance: 'none',
                        textAlign: 'center', minWidth: '240px'
                    }}
                >
                    <option value="" disabled>Load Example System...</option>
                    {architectureTestCases.map((tc) => (
                        <option key={tc.id} value={tc.id}>
                            {tc.name}
                        </option>
                    ))}
                </select>
            </div>
        </div>
    );
};

export default SystemInputForm;
