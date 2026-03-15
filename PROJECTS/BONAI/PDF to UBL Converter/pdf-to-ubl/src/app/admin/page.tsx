import { Cpu, Users, CreditCard, Key, Lock, Globe } from 'lucide-react';

export default function AdminDashboard() {
    return (
        <div>
            <div style={{ marginBottom: '32px' }}>
                <h1 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '6px' }}>Admin Dashboard</h1>
                <p style={{ color: 'var(--muted)', fontSize: '14px' }}>Beheer uw organisatie en AI-configuratie.</p>
            </div>

            <div className="compliance-banner" style={{ marginBottom: '24px' }}>
                <Lock size={14} style={{ color: 'var(--success)', flexShrink: 0 }} />
                <span><strong>Zero Data Retention</strong> — Geen documenten worden opgeslagen. Alle verwerking op Europese servers.</span>
                <Globe size={14} style={{ color: 'var(--primary)', flexShrink: 0 }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
                <a href="/admin/ai-config" className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
                    <Cpu size={24} style={{ color: 'var(--primary)', marginBottom: '12px' }} />
                    <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '6px' }}>AI Configuratie</h3>
                    <p style={{ color: 'var(--muted)', fontSize: '13px' }}>Kies AI-provider en model</p>
                </a>

                <a href="/admin/users" className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
                    <Users size={24} style={{ color: 'var(--primary)', marginBottom: '12px' }} />
                    <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '6px' }}>Gebruikers</h3>
                    <p style={{ color: 'var(--muted)', fontSize: '13px' }}>Beheer gebruikers en rollen</p>
                </a>

                <a href="/admin/credits" className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
                    <CreditCard size={24} style={{ color: 'var(--primary)', marginBottom: '12px' }} />
                    <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '6px' }}>Credits</h3>
                    <p style={{ color: 'var(--muted)', fontSize: '13px' }}>Creditbalans en gebruik</p>
                </a>

                <a href="/dashboard/api-keys" className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
                    <Key size={24} style={{ color: 'var(--primary)', marginBottom: '12px' }} />
                    <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '6px' }}>API Keys</h3>
                    <p style={{ color: 'var(--muted)', fontSize: '13px' }}>API toegangsbeheer</p>
                </a>
            </div>
        </div>
    );
}
