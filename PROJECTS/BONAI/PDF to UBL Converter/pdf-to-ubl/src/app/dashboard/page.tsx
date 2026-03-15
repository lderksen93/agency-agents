'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

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
                <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '8px' }}>Dashboard</h1>
                <p style={{ color: 'var(--muted)', fontSize: '14px' }}>Overzicht van uw conversies en creditverbruik.</p>
            </div>

            {/* Stats cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
                <div className="card">
                    <div style={{ fontSize: '12px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                        Credits Resterend
                    </div>
                    <div style={{ fontSize: '32px', fontWeight: 700, color: credits.balance > 100 ? 'var(--success)' : 'var(--warning)' }}>
                        {loading ? '...' : credits.balance}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>
                        van {credits.limit} totaal
                    </div>
                </div>

                <div className="card">
                    <div style={{ fontSize: '12px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                        Credits Gebruikt
                    </div>
                    <div style={{ fontSize: '32px', fontWeight: 700 }}>
                        {loading ? '...' : credits.totalUsed}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>facturen verwerkt</div>
                </div>

                <div className="card">
                    <div style={{ fontSize: '12px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                        Snelle Actie
                    </div>
                    <Link href="/dashboard/convert" className="btn-primary" style={{ display: 'inline-block', marginTop: '8px' }}>
                        📄 Nieuwe Conversie
                    </Link>
                </div>
            </div>

            {/* Zero Data Retention info */}
            <div className="zero-data-banner" style={{ marginBottom: '24px' }}>
                🔒 <strong>Zero Data Retention</strong> — Uw documenten worden niet opgeslagen. Alle verwerking vindt plaats op 🇪🇺 Europese servers.
            </div>

            {/* Recent conversions */}
            <div className="card">
                <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>Recente Conversies</h2>

                {conversions.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--muted)' }}>
                        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📄</div>
                        <p style={{ fontSize: '16px', marginBottom: '8px' }}>Nog geen conversies</p>
                        <p style={{ fontSize: '13px' }}>
                            <Link href="/dashboard/convert" style={{ color: 'var(--primary)' }}>Start uw eerste conversie →</Link>
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
                                            <span style={{ color: conv.overallConfidence > 0.85 ? 'var(--success)' : 'var(--warning)' }}>
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
                                            Bekijken →
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
