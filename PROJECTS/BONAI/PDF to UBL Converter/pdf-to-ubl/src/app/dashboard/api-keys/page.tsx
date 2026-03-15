'use client';

import { useEffect, useState } from 'react';

interface ApiKeyItem {
    id: string;
    name: string;
    keyPreview: string;
    lastUsedAt: string | null;
    createdAt: string;
    isActive: boolean;
}

export default function ApiKeysPage() {
    const [keys, setKeys] = useState<ApiKeyItem[]>([]);
    const [newKeyName, setNewKeyName] = useState('');
    const [newKey, setNewKey] = useState('');
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);

    useEffect(() => { loadKeys(); }, []);

    const loadKeys = async () => {
        const res = await fetch('/api/admin/api-keys');
        if (res.ok) {
            setKeys(await res.json());
        }
        setLoading(false);
    };

    const createKey = async () => {
        if (!newKeyName) return;
        setCreating(true);
        const res = await fetch('/api/admin/api-keys', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: newKeyName }),
        });
        if (res.ok) {
            const data = await res.json();
            setNewKey(data.key);
            setNewKeyName('');
            loadKeys();
        }
        setCreating(false);
    };

    const deactivateKey = async (id: string) => {
        await fetch('/api/admin/api-keys', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id }),
        });
        loadKeys();
    };

    return (
        <div>
            <div style={{ marginBottom: '32px' }}>
                <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '8px' }}>API Keys</h1>
                <p style={{ color: 'var(--muted)', fontSize: '14px' }}>
                    Beheer uw API keys voor programmatische toegang tot de conversie-API.
                </p>
            </div>

            {/* New key displayed */}
            {newKey && (
                <div className="card" style={{ marginBottom: '24px', borderColor: 'rgba(34, 197, 94, 0.3)' }}>
                    <div style={{ fontWeight: 600, marginBottom: '8px', color: 'var(--success)' }}>
                        ✅ Nieuwe API Key Aangemaakt
                    </div>
                    <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '12px' }}>
                        Kopieer deze key nu — deze wordt slechts één keer getoond.
                    </p>
                    <div style={{
                        background: 'var(--background)', borderRadius: '8px', padding: '12px',
                        fontFamily: 'monospace', fontSize: '13px', wordBreak: 'break-all',
                        border: '1px solid var(--border)',
                    }}>
                        {newKey}
                    </div>
                    <button onClick={() => { navigator.clipboard.writeText(newKey); }}
                        className="btn-secondary" style={{ marginTop: '12px', padding: '8px 16px', fontSize: '12px' }}>
                        📋 Kopieer Key
                    </button>
                </div>
            )}

            {/* Create new key */}
            <div className="card" style={{ marginBottom: '24px' }}>
                <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>Nieuwe API Key</h2>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'end' }}>
                    <div style={{ flex: 1 }}>
                        <label className="label">Key Naam</label>
                        <input className="input" placeholder="Bijv. Productie, Test"
                            value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)} />
                    </div>
                    <button onClick={createKey} className="btn-primary" disabled={!newKeyName || creating}
                        style={{ whiteSpace: 'nowrap' }}>
                        + Aanmaken
                    </button>
                </div>
            </div>

            {/* Existing keys */}
            <div className="card">
                <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>Bestaande Keys</h2>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '32px' }}>
                        <div className="spinner" style={{ margin: '0 auto' }} />
                    </div>
                ) : keys.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '32px', color: 'var(--muted)' }}>
                        Nog geen API keys aangemaakt
                    </div>
                ) : (
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Naam</th>
                                <th>Key</th>
                                <th>Laatst Gebruikt</th>
                                <th>Status</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {keys.map(k => (
                                <tr key={k.id}>
                                    <td style={{ fontWeight: 500 }}>{k.name}</td>
                                    <td style={{ fontFamily: 'monospace', fontSize: '13px' }}>{k.keyPreview}</td>
                                    <td style={{ color: 'var(--muted)', fontSize: '13px' }}>
                                        {k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleDateString('nl-NL') : 'Nooit'}
                                    </td>
                                    <td>
                                        <span className={`badge ${k.isActive ? 'badge-success' : 'badge-danger'}`}>
                                            {k.isActive ? 'Actief' : 'Inactief'}
                                        </span>
                                    </td>
                                    <td>
                                        {k.isActive && (
                                            <button onClick={() => deactivateKey(k.id)} className="btn-danger"
                                                style={{ padding: '6px 12px', fontSize: '12px' }}>
                                                Deactiveren
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* API Usage info */}
            <div className="card" style={{ marginTop: '24px' }}>
                <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>API Gebruik</h2>
                <div style={{ background: 'var(--background)', borderRadius: '8px', padding: '16px', fontFamily: 'monospace', fontSize: '13px', lineHeight: 1.8 }}>
                    <div style={{ color: 'var(--muted)' }}># Conversie starten</div>
                    <div>curl -X POST https://app.procai.nl/api/v1/convert \</div>
                    <div style={{ paddingLeft: '16px' }}>-H &quot;Authorization: Bearer prc_sk_...&quot; \</div>
                    <div style={{ paddingLeft: '16px' }}>-F &quot;file=@factuur.pdf&quot;</div>
                </div>
            </div>
        </div>
    );
}
