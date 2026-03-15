'use client';

import { useEffect, useState } from 'react';
import { Check, Lock, Globe } from 'lucide-react';

interface ModelInfo {
    id: string;
    name: string;
    contextLength: number;
    modality: string;
    promptPrice: number;
    completionPrice: number;
    description: string;
}

export default function AiConfigPage() {
    const [config, setConfig] = useState({
        aiProvider: 'openrouter',
        documentAiProjectId: '',
        documentAiLocation: 'eu',
        documentAiProcessorId: '',
        documentAiApiKey: '',
        openrouterApiKey: '',
        openrouterModel: 'google/gemini-2.0-flash-001',
    });
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [models, setModels] = useState<ModelInfo[]>([]);
    const [loadingModels, setLoadingModels] = useState(false);
    const [modelSearch, setModelSearch] = useState('');

    useEffect(() => {
        fetch('/api/admin/ai-config')
            .then(r => r.json())
            .then(data => setConfig(prev => ({ ...prev, ...data })))
            .catch(() => { });
    }, []);

    useEffect(() => {
        if (config.aiProvider === 'openrouter' && models.length === 0) {
            setLoadingModels(true);
            fetch('/api/admin/openrouter-models')
                .then(r => r.json())
                .then(data => setModels(data.models || []))
                .catch(() => { })
                .finally(() => setLoadingModels(false));
        }
    }, [config.aiProvider]);

    const handleSave = async () => {
        setSaving(true);
        setSaved(false);
        await fetch('/api/admin/ai-config', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config),
        });
        setSaving(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
    };

    const formatPrice = (price: number) => {
        if (price <= 0) return 'Gratis';
        const perMillion = price * 1000000;
        if (perMillion < 1) return `$${perMillion.toFixed(3)}/M`;
        return `$${perMillion.toFixed(2)}/M`;
    };

    const filteredModels = models.filter(m => {
        if (!modelSearch) return true;
        const q = modelSearch.toLowerCase();
        return m.id.toLowerCase().includes(q) || m.name.toLowerCase().includes(q);
    });

    const selectedModel = models.find(m => m.id === config.openrouterModel);

    return (
        <div>
            <div style={{ marginBottom: '32px' }}>
                <h1 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '6px' }}>AI Provider Configuratie</h1>
                <p style={{ color: 'var(--muted)', fontSize: '14px' }}>Kies uw AI-provider en configureer de instellingen.</p>
            </div>

            <div className="card" style={{ marginBottom: '24px' }}>
                <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>Provider Selectie</h2>
                <div style={{ display: 'flex', gap: '16px' }}>
                    {[
                        { value: 'document_ai', label: 'Google Document AI', desc: 'Gespecialiseerde factuurparser' },
                        { value: 'openrouter', label: 'OpenRouter', desc: 'Keuze uit meerdere AI-modellen' },
                    ].map(provider => (
                        <div key={provider.value}
                            onClick={() => setConfig({ ...config, aiProvider: provider.value })}
                            className="card" style={{
                                flex: 1, cursor: 'pointer',
                                borderColor: config.aiProvider === provider.value ? 'var(--primary)' : 'var(--border)',
                                background: config.aiProvider === provider.value ? 'var(--primary-light)' : '#ffffff',
                            }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                <div style={{
                                    width: '18px', height: '18px', borderRadius: '50%',
                                    border: `2px solid ${config.aiProvider === provider.value ? 'var(--primary)' : 'var(--border)'}`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    {config.aiProvider === provider.value && <div style={{
                                        width: '10px', height: '10px', borderRadius: '50%', background: 'var(--primary)',
                                    }} />}
                                </div>
                                <span style={{ fontWeight: 600 }}>{provider.label}</span>
                            </div>
                            <p style={{ fontSize: '13px', color: 'var(--muted)' }}>{provider.desc}</p>
                        </div>
                    ))}
                </div>
            </div>

            {config.aiProvider === 'document_ai' ? (
                <div className="card" style={{ marginBottom: '24px' }}>
                    <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>Google Document AI Instellingen</h2>
                    <div style={{ display: 'grid', gap: '12px' }}>
                        <div>
                            <label className="label">Project ID</label>
                            <input className="input" placeholder="your-gcp-project-id"
                                value={config.documentAiProjectId}
                                onChange={(e) => setConfig({ ...config, documentAiProjectId: e.target.value })} />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div>
                                <label className="label">Location</label>
                                <select className="input" value={config.documentAiLocation}
                                    onChange={(e) => setConfig({ ...config, documentAiLocation: e.target.value })}>
                                    <option value="eu">EU (Aanbevolen)</option>
                                    <option value="us">US</option>
                                </select>
                            </div>
                            <div>
                                <label className="label">Processor ID</label>
                                <input className="input" placeholder="processor-id"
                                    value={config.documentAiProcessorId}
                                    onChange={(e) => setConfig({ ...config, documentAiProcessorId: e.target.value })} />
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="card" style={{ marginBottom: '24px' }}>
                    <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>OpenRouter Instellingen</h2>
                    <div style={{ display: 'grid', gap: '16px' }}>
                        <div>
                            <label className="label">API Key</label>
                            <input className="input" type="password" placeholder="sk-or-v1-..."
                                value={config.openrouterApiKey}
                                onChange={(e) => setConfig({ ...config, openrouterApiKey: e.target.value })} />
                        </div>

                        <div>
                            <label className="label">AI Model</label>
                            <input
                                className="input"
                                placeholder="Zoek model..."
                                value={modelSearch}
                                onChange={(e) => setModelSearch(e.target.value)}
                                style={{ marginBottom: '8px' }}
                            />

                            {loadingModels ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', color: 'var(--muted)' }}>
                                    <div className="spinner" style={{ width: '14px', height: '14px', borderWidth: '2px' }} />
                                    Modellen laden van OpenRouter...
                                </div>
                            ) : (
                                <div style={{
                                    maxHeight: '400px', overflow: 'auto',
                                    border: '1px solid var(--border)', borderRadius: '8px',
                                }}>
                                    {filteredModels.length === 0 && (
                                        <div style={{ padding: '16px', textAlign: 'center', color: 'var(--muted)', fontSize: '13px' }}>
                                            Geen modellen gevonden
                                        </div>
                                    )}
                                    {filteredModels.map(m => (
                                        <div
                                            key={m.id}
                                            onClick={() => { setConfig({ ...config, openrouterModel: m.id }); setModelSearch(''); }}
                                            style={{
                                                padding: '10px 14px',
                                                cursor: 'pointer',
                                                borderBottom: '1px solid var(--border-light)',
                                                background: config.openrouterModel === m.id ? 'var(--primary-light)' : 'transparent',
                                                transition: 'background 0.15s',
                                            }}
                                            onMouseEnter={(e) => { if (config.openrouterModel !== m.id) e.currentTarget.style.background = 'var(--card-hover)'; }}
                                            onMouseLeave={(e) => { if (config.openrouterModel !== m.id) e.currentTarget.style.background = 'transparent'; }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div>
                                                    <div style={{ fontWeight: 500, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        {config.openrouterModel === m.id && (
                                                            <Check size={14} style={{ color: 'var(--primary)' }} />
                                                        )}
                                                        {m.name}
                                                    </div>
                                                    <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>
                                                        {m.id}
                                                    </div>
                                                </div>
                                                <div style={{ textAlign: 'right', fontSize: '11px' }}>
                                                    <div style={{ color: m.promptPrice === 0 ? 'var(--success)' : 'var(--muted)' }}>
                                                        {formatPrice(m.promptPrice)} input
                                                    </div>
                                                    <div style={{ color: 'var(--muted)' }}>
                                                        {(m.contextLength / 1000).toFixed(0)}K context
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {selectedModel && (
                            <div style={{
                                background: 'var(--primary-light)',
                                border: '1px solid rgba(0, 102, 204, 0.15)',
                                borderRadius: '8px',
                                padding: '12px',
                                fontSize: '13px',
                            }}>
                                <div style={{ fontWeight: 600, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Check size={14} style={{ color: 'var(--primary)' }} /> Geselecteerd: {selectedModel.name}
                                </div>
                                <div style={{ display: 'flex', gap: '16px', color: 'var(--muted)', fontSize: '12px' }}>
                                    <span>Input: {formatPrice(selectedModel.promptPrice)}</span>
                                    <span>Output: {formatPrice(selectedModel.completionPrice)}</span>
                                    <span>Context: {(selectedModel.contextLength / 1000).toFixed(0)}K</span>
                                    <span>{selectedModel.modality}</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div className="compliance-banner" style={{ marginBottom: '24px' }}>
                <Globe size={14} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                <span>Alle verwerking vindt plaats op Europese servers via OpenRouter EU routing. Wij hanteren <strong>Zero Data Retention</strong> — geen documenten worden opgeslagen na verwerking.</span>
                <Lock size={14} style={{ color: 'var(--success)', flexShrink: 0 }} />
            </div>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <button onClick={handleSave} className="btn-primary" disabled={saving}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {saving && <div className="spinner" style={{ width: '14px', height: '14px', borderWidth: '2px' }} />}
                    {saving ? 'Opslaan...' : 'Configuratie Opslaan'}
                </button>
                {saved && <span style={{ color: 'var(--success)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}><Check size={14} /> Opgeslagen</span>}
            </div>
        </div>
    );
}
