export default function AdminDashboard() {
    return (
        <div>
            <div style={{ marginBottom: '32px' }}>
                <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '8px' }}>🛡️ Admin Dashboard</h1>
                <p style={{ color: 'var(--muted)', fontSize: '14px' }}>Beheer uw organisatie en AI-configuratie.</p>
            </div>

            <div className="zero-data-banner" style={{ marginBottom: '24px' }}>
                🔒 <strong>Zero Data Retention</strong> — Geen documenten worden opgeslagen. 🇪🇺 Alle verwerking op Europese servers.
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
                <a href="/admin/ai-config" className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div style={{ fontSize: '32px', marginBottom: '12px' }}>🤖</div>
                    <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>AI Configuratie</h3>
                    <p style={{ color: 'var(--muted)', fontSize: '13px' }}>Kies AI-provider en model</p>
                </a>

                <a href="/admin/users" className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div style={{ fontSize: '32px', marginBottom: '12px' }}>👥</div>
                    <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>Gebruikers</h3>
                    <p style={{ color: 'var(--muted)', fontSize: '13px' }}>Beheer gebruikers en rollen</p>
                </a>

                <a href="/admin/credits" className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div style={{ fontSize: '32px', marginBottom: '12px' }}>💳</div>
                    <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>Credits</h3>
                    <p style={{ color: 'var(--muted)', fontSize: '13px' }}>Creditbalans en gebruik</p>
                </a>

                <a href="/dashboard/api-keys" className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div style={{ fontSize: '32px', marginBottom: '12px' }}>🔑</div>
                    <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>API Keys</h3>
                    <p style={{ color: 'var(--muted)', fontSize: '13px' }}>API toegangsbeheer</p>
                </a>
            </div>
        </div>
    );
}
