export default function AdminCreditsPage() {
    return (
        <div>
            <div style={{ marginBottom: '32px' }}>
                <h1 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '6px' }}>Credit Overzicht</h1>
                <p style={{ color: 'var(--muted)', fontSize: '14px' }}>Bekijk uw creditverbruik en balans.</p>
            </div>

            <div className="card" style={{ marginBottom: '24px', textAlign: 'center', padding: '48px' }}>
                <p style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '24px' }}>
                    Uw organisatie start met <strong>1000 credits</strong>. Elke conversie kost 1 credit per factuur.
                </p>
                <p style={{ color: 'var(--muted)', fontSize: '14px' }}>
                    Meer credits nodig? Neem contact op met <a href="mailto:info@bonai.nl" style={{ color: 'var(--primary)' }}>info@bonai.nl</a>.
                </p>
            </div>
        </div>
    );
}
