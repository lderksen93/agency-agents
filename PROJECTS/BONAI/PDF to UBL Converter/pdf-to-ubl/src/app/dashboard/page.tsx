'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { TrendingUp, CreditCard, FileText, Lock, Globe } from 'lucide-react';

interface ConversionItem {
    id: string;
    status: string;
    documentType: string;
    originalFilename: string;
    overallConfidence: number | null;
    creditsUsed: number;
    createdAt: string;
}

export default function DashboardPage() {
    const [conversions, setConversions] = useState<ConversionItem[]>([]);
    const [credits, setCredits] = useState({ balance: 0, totalUsed: 0, limit: 1000 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            fetch('/api/v1/credits').then(r => r.json()).catch(() => ({ balance: 0, totalUsed: 0, limit: 1000 })),
            fetch('/api/v1/conversions').then(r => r.json()).catch(() => ({ conversions: [] })),
        ]).then(([creditData, convData]) => {
            setCredits(creditData);
            setConversions(convData.conversions || []);
            setLoading(false);
        });
    }, []);

    const statusBadge = (status: string) => {
        const map: Record<string, { class: string; label: string }> = {
            completed: { class: 'badge-success', label: 'Voltooid' },
            processing: { class: 'badge-info', label: 'Verwerken...' },
            pending: { class: 'badge-warning', label: 'Wachtend' },
            failed: { class: 'badge-danger', label: 'Mislukt' },
            flagged: { class: 'badge-warning', label: 'Gemarkeerd' },
        };
        const info = map[status] || { class: 'badge-info', label: status };
        return <span className={`badge ${info.class}`}>{info.label}</span>;
    };

    return (
        <div>
            <div style={{ marginBottom: '32px' }}>
                <h1 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '6px' }}>Dashboard</h1>
                <p style={{ color: 'var(--muted)', fontSize: '14px' }}>Overzicht van uw conversies en creditverbruik.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '28px' }}>
                <div className="card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                        <CreditCard size={16} style={{ color: 'var(--muted)' }} />
                        <span style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 500 }}>Credits Resterend</span>
                    </div>
                    <div style={{ fontSize: '28px', fontWeight: 600, color: credits.balance > 100 ? 'var(--success)' : 'var(--warning)' }}>
                        {loading ? '...' : credits.balance}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>
                        van {credits.limit} totaal
                    </div>
                </div>

                <div className="card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                        <TrendingUp size={16} style={{ color: 'var(--muted)' }} />
                        <span style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 500 }}>Credits Gebruikt</span>
                    </div>
                    <div style={{ fontSize: '28px', fontWeight: 600 }}>
                        {loading ? '...' : credits.totalUsed}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>facturen verwerkt</div>
                </div>

                <div className="card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                        <FileText size={16} style={{ color: 'var(--muted)' }} />
                        <span style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 500 }}>Snelle Actie</span>
                    </div>
                    <Link href="/dashboard/convert" className="btn-primary" style={{ display: 'inline-block', marginTop: '4px', fontSize: '13px', padding: '8px 16px' }}>
                        Nieuwe Conversie
                    </Link>
                </div>
            </div>

            <div className="compliance-banner" style={{ marginBottom: '24px' }}>
                <Lock size={14} style={{ color: 'var(--success)', flexShrink: 0 }} />
                <span><strong>Zero Data Retention</strong> — Uw documenten worden niet opgeslagen. Alle verwerking vindt plaats op Europese servers.</span>
                <Globe size={14} style={{ color: 'var(--primary)', flexShrink: 0 }} />
            </div>

            <div className="card">
                <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>Recente Conversies</h2>

                {conversions.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--muted)' }}>
                        <FileText size={40} style={{ color: 'var(--border)', marginBottom: '12px' }} />
                        <p style={{ fontSize: '15px', marginBottom: '8px' }}>Nog geen conversies</p>
                        <p style={{ fontSize: '13px' }}>
                            <Link href="/dashboard/convert" style={{ color: 'var(--primary)' }}>Start uw eerste conversie</Link>
                        </p>
                    </div>
                ) : (
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Bestand</th>
                                <th>Status</th>
                                <th>Zekerheid</th>
                                <th>Credits</th>
                                <th>Datum</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {conversions.map(conv => (
                                <tr key={conv.id}>
                                    <td style={{ fontWeight: 500 }}>{conv.originalFilename}</td>
                                    <td>{statusBadge(conv.status)}</td>
                                    <td>
                                        {conv.overallConfidence !== null ? (
                                            <span style={{ color: conv.overallConfidence > 0.85 ? 'var(--success)' : 'var(--warning)', fontWeight: 500 }}>
                                                {Math.round(conv.overallConfidence * 100)}%
                                            </span>
                                        ) : '—'}
                                    </td>
                                    <td>{conv.creditsUsed}</td>
                                    <td style={{ color: 'var(--muted)', fontSize: '13px' }}>
                                        {new Date(conv.createdAt).toLocaleDateString('nl-NL')}
                                    </td>
                                    <td>
                                        <Link href={`/dashboard/results/${conv.id}`} style={{ color: 'var(--primary)', fontSize: '13px' }}>
                                            Bekijken
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
