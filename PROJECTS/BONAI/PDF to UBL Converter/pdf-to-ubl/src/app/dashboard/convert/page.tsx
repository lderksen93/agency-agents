'use client';

import { useState, useRef, useCallback } from 'react';
import { FIELD_LABELS, FIELD_GROUPS } from '@/lib/ubl-field-labels';

export default function ConvertPage() {
    const [file, setFile] = useState<File | null>(null);
    const [adminInfo, setAdminInfo] = useState({ name: '', address: '', kvk: '', iban: '' });
    const [dragging, setDragging] = useState(false);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState('');
    const [showXml, setShowXml] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragging(false);
        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile?.name.toLowerCase().endsWith('.pdf')) {
            setFile(droppedFile);
        } else {
            setError('Alleen PDF bestanden worden ondersteund');
        }
    }, []);

    const handleSubmit = async () => {
        if (!file) return;
        setLoading(true);
        setError('');
        setResult(null);

        const formData = new FormData();
        formData.append('file', file);
        if (adminInfo.name) formData.append('adminName', adminInfo.name);
        if (adminInfo.address) formData.append('adminAddress', adminInfo.address);
        if (adminInfo.kvk) formData.append('adminKvk', adminInfo.kvk);
        if (adminInfo.iban) formData.append('adminIban', adminInfo.iban);

        try {
            const res = await fetch('/api/v1/convert', { method: 'POST', body: formData });
            const data = await res.json();

            if (!res.ok) {
                setError(data.message || 'Conversie mislukt');
            } else {
                setResult(data);
            }
        } catch {
            setError('Er is een fout opgetreden');
        } finally {
            setLoading(false);
        }
    };

    const downloadUbl = async (xml: string, index: number) => {
        const convId = result?.conversionId || result?.id;
        const filename = `${(file?.name || result?.originalFilename || 'factuur').replace(/\.pdf$/i, '')}_ubl_${index}.xml`;
        if (convId) {
            try {
                const res = await fetch(`/api/v1/convert/${convId}/download?index=${index}`);
                if (res.ok) {
                    const blob = await res.blob();
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = filename;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    setTimeout(() => URL.revokeObjectURL(url), 5000);
                    return;
                }
            } catch { /* fallback below */ }
        }
        // Fallback: client-side download from existing XML data
        const blob = new Blob([xml], { type: 'application/xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 5000);
    };

    const confidenceColor = (score: number) =>
        score >= 0.95 ? 'var(--success)' : score >= 0.85 ? '#4ade80' : score >= 0.7 ? 'var(--warning)' : 'var(--danger)';

    const renderFieldRow = (key: string, val: any) => (
        <tr key={key}>
            <td style={{ fontWeight: 500, color: 'var(--muted)', fontSize: '12px', width: '35%' }}>
                {FIELD_LABELS[key] || key}
            </td>
            <td style={{ fontWeight: 500 }}>
                {val?.value !== null && val?.value !== undefined ? String(val.value) : <span style={{ color: 'var(--muted)', fontStyle: 'italic' }}>—</span>}
            </td>
            <td style={{ width: '60px', textAlign: 'right' }}>
                <span style={{
                    color: confidenceColor(val?.confidence || 0),
                    fontWeight: 600, fontSize: '12px',
                }}>
                    {Math.round((val?.confidence || 0) * 100)}%
                </span>
            </td>
            <td style={{ width: '30px', textAlign: 'center' }}>
                {val?.needsReview && <span title="Controle vereist">⚠️</span>}
            </td>
        </tr>
    );

    return (
        <div>
            <div style={{ marginBottom: '32px' }}>
                <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '8px' }}>PDF naar UBL Conversie</h1>
                <p style={{ color: 'var(--muted)', fontSize: '14px' }}>Upload een PDF-factuur om te converteren naar UBL XML.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                {/* Left: Upload */}
                <div>
                    <div className="card" style={{ marginBottom: '16px' }}>
                        <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>📄 PDF Upload</h2>

                        <div
                            className={`dropzone ${dragging ? 'active' : ''}`}
                            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                            onDragLeave={() => setDragging(false)}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <input ref={fileInputRef} type="file" accept=".pdf" hidden
                                onChange={(e) => { if (e.target.files?.[0]) setFile(e.target.files[0]); }} />

                            {file ? (
                                <div>
                                    <div style={{ fontSize: '40px', marginBottom: '12px' }}>✅</div>
                                    <div style={{ fontWeight: 600, marginBottom: '4px' }}>{file.name}</div>
                                    <div style={{ color: 'var(--muted)', fontSize: '13px' }}>
                                        {(file.size / 1024).toFixed(0)} KB • Klik om te wijzigen
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <div style={{ fontSize: '40px', marginBottom: '12px' }}>📂</div>
                                    <div style={{ fontWeight: 500, marginBottom: '4px' }}>Sleep uw PDF hierheen</div>
                                    <div style={{ color: 'var(--muted)', fontSize: '13px' }}>of klik om te selecteren (max 20MB)</div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Admin info */}
                    <div className="card">
                        <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>🏢 Administratie Gegevens <span style={{ fontSize: '12px', fontWeight: 400, color: 'var(--muted)' }}>(optioneel)</span></h2>
                        <div style={{ display: 'grid', gap: '12px' }}>
                            <div>
                                <label className="label">Administratienaam</label>
                                <input className="input" placeholder="Bijv. Uw bedrijfsnaam"
                                    value={adminInfo.name} onChange={(e) => setAdminInfo({ ...adminInfo, name: e.target.value })} />
                            </div>
                            <div>
                                <label className="label">Adres</label>
                                <input className="input" placeholder="Straat + Huisnummer, Postcode, Plaats"
                                    value={adminInfo.address} onChange={(e) => setAdminInfo({ ...adminInfo, address: e.target.value })} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label className="label">KVK-nummer</label>
                                    <input className="input" placeholder="12345678"
                                        value={adminInfo.kvk} onChange={(e) => setAdminInfo({ ...adminInfo, kvk: e.target.value })} />
                                </div>
                                <div>
                                    <label className="label">IBAN</label>
                                    <input className="input" placeholder="NL91ABNA0417164300"
                                        value={adminInfo.iban} onChange={(e) => setAdminInfo({ ...adminInfo, iban: e.target.value })} />
                                </div>
                            </div>
                        </div>
                    </div>

                    <button onClick={handleSubmit} className="btn-primary" disabled={!file || loading}
                        style={{ width: '100%', marginTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        {loading && <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }} />}
                        {loading ? 'Verwerken...' : '🚀 Converteren naar UBL'}
                    </button>
                </div>

                {/* Right: Results */}
                <div>
                    {error && (
                        <div className="card" style={{ borderColor: 'rgba(239, 68, 68, 0.3)', marginBottom: '16px' }}>
                            <div style={{ color: 'var(--danger)', fontWeight: 600, marginBottom: '8px' }}>❌ Fout</div>
                            <div style={{ fontSize: '14px' }}>{error}</div>
                        </div>
                    )}

                    {result && (
                        <>
                            {/* Status overview */}
                            <div className="card" style={{ marginBottom: '16px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                    <h2 style={{ fontSize: '16px', fontWeight: 600 }}>Resultaat</h2>
                                    <span className={`badge ${result.status === 'completed' ? 'badge-success' : 'badge-warning'}`}>
                                        {result.status === 'completed' ? '✅ Voltooid' : '⚠️ ' + result.status}
                                    </span>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', fontSize: '13px' }}>
                                    <div><span style={{ color: 'var(--muted)' }}>Type:</span> {result.documentType}</div>
                                    <div><span style={{ color: 'var(--muted)' }}>Facturen:</span> {result.invoiceCount}</div>
                                    <div><span style={{ color: 'var(--muted)' }}>Credits:</span> {result.creditsUsed} gebruikt</div>
                                    <div><span style={{ color: 'var(--muted)' }}>Resterend:</span> {result.creditsRemaining}</div>
                                </div>
                            </div>

                            {/* Per invoice result */}
                            {result.results?.map((res: any, idx: number) => (
                                <div key={idx}>
                                    {/* Confidence header */}
                                    <div className="card" style={{ marginBottom: '16px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                            <h3 style={{ fontSize: '15px', fontWeight: 600 }}>Factuur {idx + 1}</h3>
                                            <span style={{
                                                fontSize: '24px', fontWeight: 700,
                                                color: confidenceColor(res.overallConfidence),
                                            }}>
                                                {Math.round(res.overallConfidence * 100)}%
                                            </span>
                                        </div>

                                        <div className="confidence-bar" style={{ marginBottom: '12px' }}>
                                            <div className="confidence-fill" style={{
                                                width: `${Math.round(res.overallConfidence * 100)}%`,
                                                background: res.overallConfidence > 0.85
                                                    ? 'linear-gradient(90deg, var(--success), #4ade80)'
                                                    : 'linear-gradient(90deg, var(--warning), #fbbf24)',
                                            }} />
                                        </div>

                                        {res.flaggedFields?.length > 0 && (
                                            <div style={{
                                                background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.2)',
                                                borderRadius: '10px', padding: '12px', fontSize: '13px',
                                            }}>
                                                ⚠️ <strong>{res.flaggedFields.length} veld(en)</strong> vereisen controle: {res.flaggedFields.join(', ')}
                                            </div>
                                        )}
                                    </div>

                                    {/* Grouped extracted data sections */}
                                    {Object.entries(FIELD_GROUPS).map(([groupName, fieldKeys]) => {
                                        const groupFields = fieldKeys.filter(k => res.extractedData?.[k] !== undefined);
                                        if (groupFields.length === 0) return null;

                                        return (
                                            <div key={groupName} className="card" style={{ marginBottom: '16px' }}>
                                                <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: 'var(--primary)' }}>
                                                    {groupName}
                                                </h4>
                                                <table className="table" style={{ fontSize: '13px' }}>
                                                    <tbody>
                                                        {groupFields.map(key => renderFieldRow(key, res.extractedData[key]))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        );
                                    })}

                                    {/* Other fields not in any group */}
                                    {(() => {
                                        const allGroupKeys = Object.values(FIELD_GROUPS).flat();
                                        const otherFields = Object.entries(res.extractedData || {}).filter(
                                            ([key]) => !allGroupKeys.includes(key)
                                        );
                                        if (otherFields.length === 0) return null;

                                        return (
                                            <div className="card" style={{ marginBottom: '16px' }}>
                                                <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: 'var(--primary)' }}>
                                                    Overige Velden
                                                </h4>
                                                <table className="table" style={{ fontSize: '13px' }}>
                                                    <tbody>
                                                        {otherFields.map(([key, val]) => renderFieldRow(key, val))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        );
                                    })()}

                                    {/* Line Items */}
                                    {res.extractedData?.lineItems && Array.isArray(res.extractedData.lineItems) && res.extractedData.lineItems.length > 0 && (
                                        <div className="card" style={{ marginBottom: '16px' }}>
                                            <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: 'var(--primary)' }}>
                                                📋 Factuurregels ({res.extractedData.lineItems.length})
                                            </h4>
                                            <div style={{ overflowX: 'auto' }}>
                                                <table className="table" style={{ fontSize: '12px' }}>
                                                    <thead>
                                                        <tr>
                                                            <th>#</th>
                                                            <th>Omschrijving</th>
                                                            <th style={{ textAlign: 'right' }}>Aantal</th>
                                                            <th style={{ textAlign: 'right' }}>Prijs</th>
                                                            <th style={{ textAlign: 'right' }}>Bedrag</th>
                                                            <th style={{ textAlign: 'right' }}>BTW %</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {res.extractedData.lineItems.map((li: any, liIdx: number) => (
                                                            <tr key={liIdx}>
                                                                <td>{li.lineNumber?.value || liIdx + 1}</td>
                                                                <td>{li.description?.value || '—'}</td>
                                                                <td style={{ textAlign: 'right' }}>{li.quantity?.value || '—'}</td>
                                                                <td style={{ textAlign: 'right' }}>{li.unitPrice?.value ? `€${Number(li.unitPrice.value).toFixed(2)}` : '—'}</td>
                                                                <td style={{ textAlign: 'right', fontWeight: 500 }}>{li.lineNetAmount?.value ? `€${Number(li.lineNetAmount.value).toFixed(2)}` : '—'}</td>
                                                                <td style={{ textAlign: 'right' }}>{li.vatRate?.value != null ? `${li.vatRate.value}%` : '—'}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}

                                    {/* VAT Breakdown */}
                                    {res.extractedData?.vatBreakdown && Array.isArray(res.extractedData.vatBreakdown) && res.extractedData.vatBreakdown.length > 0 && (
                                        <div className="card" style={{ marginBottom: '16px' }}>
                                            <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: 'var(--primary)' }}>
                                                🧾 BTW Specificatie
                                            </h4>
                                            <table className="table" style={{ fontSize: '12px' }}>
                                                <thead>
                                                    <tr>
                                                        <th>Categorie</th>
                                                        <th style={{ textAlign: 'right' }}>Tarief</th>
                                                        <th style={{ textAlign: 'right' }}>Belastbaar</th>
                                                        <th style={{ textAlign: 'right' }}>BTW Bedrag</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {res.extractedData.vatBreakdown.map((vb: any, vbIdx: number) => (
                                                        <tr key={vbIdx}>
                                                            <td>{vb.vatCategoryCode?.value || 'S'}</td>
                                                            <td style={{ textAlign: 'right' }}>{vb.vatRate?.value != null ? `${vb.vatRate.value}%` : '—'}</td>
                                                            <td style={{ textAlign: 'right' }}>{vb.taxableAmount?.value ? `€${Number(vb.taxableAmount.value).toFixed(2)}` : '—'}</td>
                                                            <td style={{ textAlign: 'right', fontWeight: 500 }}>{vb.taxAmount?.value ? `€${Number(vb.taxAmount.value).toFixed(2)}` : '—'}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}

                                    {/* Actions: Download, Copy, View XML */}
                                    <div className="card" style={{ marginBottom: '16px' }}>
                                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                                            {res.ublXml && (
                                                <button onClick={() => downloadUbl(res.ublXml, idx)} className="btn-primary" style={{ padding: '8px 16px', fontSize: '13px' }}>
                                                    📥 Download UBL XML
                                                </button>
                                            )}
                                            <button onClick={() => navigator.clipboard.writeText(res.ublXml || '')} className="btn-secondary" style={{ padding: '8px 16px', fontSize: '13px' }}>
                                                📋 Kopieer XML
                                            </button>
                                            {res.ublXml && (
                                                <button onClick={() => setShowXml(!showXml)} className="btn-secondary" style={{ padding: '8px 16px', fontSize: '13px' }}>
                                                    {showXml ? '🔽 Verberg XML' : '📄 Toon UBL XML'}
                                                </button>
                                            )}

                                            {/* Validation badge */}
                                            {res.validationResult && (
                                                <span className={`badge ${res.validationResult.isValid ? 'badge-success' : 'badge-danger'}`} style={{ marginLeft: 'auto' }}>
                                                    {res.validationResult.isValid ? '✅ Valid UBL (Peppol BIS 3.0)' : '❌ Validatiefouten'}
                                                </span>
                                            )}
                                        </div>

                                        {/* Expandable XML view */}
                                        {showXml && res.ublXml && (
                                            <div style={{ marginTop: '12px' }}>
                                                <pre style={{
                                                    background: 'rgba(0,0,0,0.3)',
                                                    border: '1px solid rgba(255,255,255,0.1)',
                                                    borderRadius: '8px',
                                                    padding: '16px',
                                                    fontSize: '11px',
                                                    lineHeight: '1.5',
                                                    maxHeight: '400px',
                                                    overflow: 'auto',
                                                    whiteSpace: 'pre-wrap',
                                                    wordBreak: 'break-all',
                                                }}>
                                                    {res.ublXml}
                                                </pre>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </>
                    )}

                    {!result && !error && (
                        <div className="card" style={{ textAlign: 'center', padding: '64px 24px', color: 'var(--muted)' }}>
                            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
                            <p>Upload een PDF om het resultaat hier te zien</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
