export default function DashboardSettingsPage() {
    return (
        <div>
            <div style={{ marginBottom: '32px' }}>
                <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '8px' }}>⚙️ Instellingen</h1>
                <p style={{ color: 'var(--muted)', fontSize: '14px' }}>Organisatie instellingen en voorkeuren.</p>
            </div>

            <div className="card" style={{ marginBottom: '24px' }}>
                <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>Standaard Administratie Gegevens</h2>
                <p style={{ color: 'var(--muted)', fontSize: '13px', marginBottom: '16px' }}>
                    Deze gegevens worden automatisch ingevuld bij nieuwe conversies als afnemer (buyer) informatie.
                </p>
                <div style={{ display: 'grid', gap: '12px' }}>
                    <div>
                        <label className="label">Bedrijfsnaam</label>
                        <input className="input" placeholder="Uw bedrijfsnaam" />
                    </div>
                    <div>
                        <label className="label">Adres</label>
                        <input className="input" placeholder="Straat + huisnummer, postcode, plaats" />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div>
                            <label className="label">KVK-nummer</label>
                            <input className="input" placeholder="12345678" />
                        </div>
                        <div>
                            <label className="label">IBAN</label>
                            <input className="input" placeholder="NL91ABNA0417164300" />
                        </div>
                    </div>
                </div>
                <button className="btn-primary" style={{ marginTop: '16px' }}>Opslaan</button>
            </div>

            <div className="zero-data-banner">
                🔒 <strong>Zero Data Retention</strong> — Uw documenten worden nooit opgeslagen.
                🇪🇺 Alle verwerking op Europese servers.
            </div>
        </div>
    );
}
