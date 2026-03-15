'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { FIELD_LABELS, FIELD_GROUPS } from '@/lib/ubl-field-labels';

export default function ResultsPage() {
    const params = useParams();
    const id = params.id as string;
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showXml, setShowXml] = useState(false);

    useEffect(() => {
        fetch(`/api/v1/convert/${id}`)
            .then(r => { if (!r.ok) throw new Error('Niet gevonden'); return r.json(); })
            .then(d => setData(d))
            .catch(e => setError(e.message))
            .finally(() => setLoading(false));
    }, [id]);

    const confidenceColor = (score: number) =>
        score >= 0.95 ? 'var(--success)' : score >= 0.85 ? '#4ade80' : score >= 0.7 ? 'var(--warning)' : 'var(--danger)';

    const downloadUbl = async (xml: string, index: number) => {
        const filename = `${(data?.originalFilename || 'factuur').replace(/\.pdf$/i, '')}_ubl_${index}.xml`;
        try {
            const res = await fetch(`/api/v1/convert/${data?.id}/download?index=${index}`);
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
            }
        } catch {
            // Fallback: direct navigation
            window.location.href = `/api/v1/convert/${data?.id}/download?index=${index}`;
        }
    };

    if (loading) return (
        <div style={{ padding: '48px', textAlign: 'center' }}>
            <div className="spinner" style={{ margin: '0 auto 16px' }} />
            <p style={{ color: 'var(--muted)' }}>Laden...</p>
        </div>
    );

    if (error) return (
        <div className="card" style={{ maxWidth: '500px', margin: '48px auto', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>❌</div>
            <p style={{ fontWeight: 600 }}>{error}</p>
            <Link href="/dashboard" style={{ color: 'var(--primary)', marginTop: '16px', display: 'inline-block' }}>← Terug naar dashboard</Link>
        </div>
    );

    if (!data) return null;

    const statusMap: Record<string, { class: string; label: string }> = {
        completed: { class: 'badge-success', label: '✅ Voltooid' },
        failed: { class: 'badge-danger', label: '❌ Mislukt' },
        flagged: { class: 'badge-warning', label: '⚠️ Gemarkeerd' },
        processing: { class: 'badge-info', label: '⏳ Verwerken' },
    };
    const status = statusMap[data.status] || { class: 'badge-info', label: data.status };

    return (
        <div>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <Link href="/dashboard" style={{ color: 'var(--muted)', fontSize: '13px' }}>← Terug naar dashboard</Link>
                    <h1 style={{ fontSize: '24px', fontWeight: 700, marginTop: '8px' }}>{data.originalFilename}</h1>
                    <p style={{ color: 'var(--muted)', fontSize: '13px' }}>
                        {new Date(data.createdAt).toLocaleString('nl-NL')} • {data.processingTimeMs ? `${(data.processingTimeMs / 1000).toFixed(1)}s` : ''}
                    </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <span className={`badge ${status.class}`} style={{ marginBottom: '8px', display: 'inline-block' }}>{status.label}</span>
                    {data.overallConfidence != null && (
                        <div style={{ fontSize: '32px', fontWeight: 700, color: confidenceColor(data.overallConfidence) }}>
                            {Math.round(data.overallConfidence * 100)}%
                        </div>
                    )}
                </div>
            </div>

            {/* Stats row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', marginBottom: '24px' }}>
                {[
                    { label: 'Type', value: data.documentType || '—' },
                    { label: 'Facturen', value: data.invoiceCount || 0 },
                    { label: 'Credits', value: `${data.creditsUsed || 0} gebruikt` },
                    { label: 'Resterend', value: data.creditsRemaining || 0 },
                    { label: 'AI Provider', value: data.flagReason || 'OpenRouter' },
                ].map((s, i) => (
                    <div key={i} className="card" style={{ padding: '12px' }}>
                        <div style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '4px' }}>{s.label}</div>
                        <div style={{ fontSize: '16px', fontWeight: 600 }}>{s.value}</div>
                    </div>
                ))}
            </div>

            {/* Results */}
            {(data.results || []).map((res: any, idx: number) => (
                <div key={idx}>
                    {/* Confidence */}
                    {res.flaggedFields?.length > 0 && (
                        <div className="card" style={{ marginBottom: '16px', borderColor: 'rgba(245, 158, 11, 0.3)' }}>
                            ⚠️ <strong>{res.flaggedFields.length} veld(en)</strong> vereisen controle: {res.flaggedFields.join(', ')}
                        </div>
                    )}

                    {/* Grouped fields */}
                    {Object.entries(FIELD_GROUPS).map(([groupName, fieldKeys]) => {
                        const groupFields = fieldKeys.filter(k => res.extractedData?.[k] !== undefined);
                        if (groupFields.length === 0) return null;

                        return (
                            <div key={groupName} className="card" style={{ marginBottom: '16px' }}>
                                <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: 'var(--primary)' }}>
                                    {groupName}
                                </h3>
                                <table className="table" style={{ fontSize: '13px' }}>
                                    <tbody>
                                        {groupFields.map(key => {
                                            const val = res.extractedData[key];
                                            return (
                                                <tr key={key}>
                                                    <td style={{ fontWeight: 500, color: 'var(--muted)', fontSize: '12px', width: '35%' }}>
                                                        {FIELD_LABELS[key] || key}
                                                    </td>
                                                    <td style={{ fontWeight: 500 }}>
                                                        {val?.value != null ? String(val.value) : <span style={{ color: 'var(--muted)', fontStyle: 'italic' }}>—</span>}
                                                    </td>
                                                    <td style={{ width: '60px', textAlign: 'right' }}>
                                                        <span style={{ color: confidenceColor(val?.confidence || 0), fontWeight: 600, fontSize: '12px' }}>
                                                            {Math.round((val?.confidence || 0) * 100)}%
                                                        </span>
                                                    </td>
                                                    <td style={{ width: '30px', textAlign: 'center' }}>
                                                        {val?.needsReview && '⚠️'}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        );
                    })}

                    {/* Other fields */}
                    {(() => {
                        const allGroupKeys = Object.values(FIELD_GROUPS).flat();
                        const otherFields = Object.entries(res.extractedData || {}).filter(
                            ([key]) => !allGroupKeys.includes(key) && key !== 'lineItems' && key !== 'vatBreakdown'
                        );
                        if (otherFields.length === 0) return null;

                        return (
                            <div className="card" style={{ marginBottom: '16px' }}>
                                <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: 'var(--primary)' }}>
                                    Overige Velden
                                </h3>
                                <table className="table" style={{ fontSize: '13px' }}>
                                    <tbody>
                                        {otherFields.map(([key, val]: [string, any]) => (
                                            <tr key={key}>
                                                <td style={{ fontWeight: 500, color: 'var(--muted)', fontSize: '12px', width: '35%' }}>{FIELD_LABELS[key] || key}</td>
                                                <td>{val?.value != null ? String(val.value) : '—'}</td>
                                                <td style={{ width: '60px', textAlign: 'right' }}>
                                                    <span style={{ color: confidenceColor(val?.confidence || 0), fontWeight: 600, fontSize: '12px' }}>
                                                        {Math.round((val?.confidence || 0) * 100)}%
                                                    </span>
                                                </td>
                                                <td style={{ width: '30px' }}>{val?.needsReview && '⚠️'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        );
                    })()}

                    {/* Line Items */}
                    {res.extractedData?.lineItems?.length > 0 && (
                        <div className="card" style={{ marginBottom: '16px' }}>
                            <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: 'var(--primary)' }}>
                                📋 Factuurregels ({res.extractedData.lineItems.length})
                            </h3>
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
                    {res.extractedData?.vatBreakdown?.length > 0 && (
                        <div className="card" style={{ marginBottom: '16px' }}>
                            <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: 'var(--primary)' }}>
                                🧾 BTW Specificatie
                            </h3>
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

                    {/* Actions */}
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
                            {res.isValid != null && (
                                <span className={`badge ${res.isValid ? 'badge-success' : 'badge-danger'}`} style={{ marginLeft: 'auto' }}>
                                    {res.isValid ? '✅ Valid UBL (Peppol BIS 3.0)' : '❌ Validatiefouten'}
                                </span>
                            )}
                        </div>

                        {showXml && res.ublXml && (
                            <pre style={{
                                marginTop: '12px', background: 'rgba(0,0,0,0.3)',
                                border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px',
                                padding: '16px', fontSize: '11px', lineHeight: '1.5',
                                maxHeight: '400px', overflow: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                            }}>
                                {res.ublXml}
                            </pre>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}
