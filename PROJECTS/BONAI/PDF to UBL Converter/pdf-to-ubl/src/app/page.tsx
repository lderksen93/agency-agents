import Link from 'next/link';

export default function LandingPage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Navigation */}
      <nav style={{
        padding: '20px 40px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '10px',
            background: 'linear-gradient(135deg, var(--primary), #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, fontSize: '16px', color: 'white',
          }}>P</div>
          <span style={{ fontWeight: 700, fontSize: '20px' }}>Procai</span>
        </div>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <Link href="/login" className="btn-secondary" style={{ padding: '8px 20px' }}>Inloggen</Link>
          <Link href="/register" className="btn-primary" style={{ padding: '8px 20px' }}>Registreren</Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '80px 40px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Background gradient */}
        <div style={{
          position: 'absolute', top: '-200px', left: '50%', transform: 'translateX(-50%)',
          width: '800px', height: '600px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.12) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* Trust badges */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginBottom: '32px' }}>
            <span className="badge badge-success">🔒 Zero Data Retention</span>
            <span className="badge badge-info">🇪🇺 Europese Servers</span>
            <span className="badge badge-warning">⚡ AI-Powered</span>
          </div>

          <h1 style={{
            fontSize: '56px', fontWeight: 800, lineHeight: 1.1, marginBottom: '24px',
            background: 'linear-gradient(135deg, #fff, #a5b4fc)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            maxWidth: '800px',
          }}>
            PDF Facturen naar UBL XML in Seconden
          </h1>

          <p style={{
            fontSize: '18px', color: 'var(--muted)', maxWidth: '600px',
            marginBottom: '40px', lineHeight: 1.7,
          }}>
            Converteer uw PDF-facturen automatisch naar gevalideerde UBL XML
            (Peppol BIS 3.0 / EN 16931). Met AI-extractie, per-veld zekerheidsscores
            en volledige privacy-garantie.
          </p>

          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
            <Link href="/register" className="btn-primary" style={{ padding: '16px 40px', fontSize: '16px' }}>
              Gratis Starten — 1000 Credits
            </Link>
            <Link href="/login" className="btn-secondary" style={{ padding: '16px 40px', fontSize: '16px' }}>
              API Documentatie →
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section style={{ padding: '80px 40px', maxWidth: '1200px', margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center', fontSize: '36px', fontWeight: 700, marginBottom: '48px' }}>
          Waarom Procai?
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
          <div className="card">
            <div style={{ fontSize: '32px', marginBottom: '16px' }}>🤖</div>
            <h3 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '12px' }}>AI-Gestuurde Extractie</h3>
            <p style={{ color: 'var(--muted)', fontSize: '14px' }}>
              Kies uw AI-provider: Google Document AI of OpenRouter met modellen
              zoals Gemini, Claude of Llama. Admin selecteert het model.
            </p>
          </div>

          <div className="card">
            <div style={{ fontSize: '32px', marginBottom: '16px' }}>✅</div>
            <h3 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '12px' }}>Per-Veld Zekerheidsscores</h3>
            <p style={{ color: 'var(--muted)', fontSize: '14px' }}>
              Elk geëxtraheerd veld krijgt een confidence score (0-100%).
              Onzekere velden worden automatisch gemarkeerd voor menselijke controle.
            </p>
          </div>

          <div className="card">
            <div style={{ fontSize: '32px', marginBottom: '16px' }}>📋</div>
            <h3 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '12px' }}>Peppol BIS 3.0 Compliant</h3>
            <p style={{ color: 'var(--muted)', fontSize: '14px' }}>
              Gegenereerde UBL XML wordt gevalideerd tegen Schematron en XSD regels.
              Volledig conform EN 16931 en Peppol BIS Billing 3.0.
            </p>
          </div>

          <div className="card">
            <div style={{ fontSize: '32px', marginBottom: '16px' }}>🔒</div>
            <h3 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '12px' }}>Zero Data Retention</h3>
            <p style={{ color: 'var(--muted)', fontSize: '14px' }}>
              Geen documenten worden opgeslagen na verwerking. Uw factuurdata
              wordt onmiddellijk uit het geheugen gewist na conversie.
            </p>
          </div>

          <div className="card">
            <div style={{ fontSize: '32px', marginBottom: '16px' }}>🇪🇺</div>
            <h3 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '12px' }}>Europese Servers</h3>
            <p style={{ color: 'var(--muted)', fontSize: '14px' }}>
              Alle AI-verwerking vindt uitsluitend plaats op Europese servers.
              Volledige GDPR-compliance voor uw factuurverwerking.
            </p>
          </div>

          <div className="card">
            <div style={{ fontSize: '32px', marginBottom: '16px' }}>🔗</div>
            <h3 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '12px' }}>REST API</h3>
            <p style={{ color: 'var(--muted)', fontSize: '14px' }}>
              Integreer PDF-naar-UBL conversie in uw eigen software met onze
              eenvoudige REST API. API key-beheer via het dashboard.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid var(--border)',
        padding: '40px',
        textAlign: 'center',
        color: 'var(--muted)',
        fontSize: '13px',
      }}>
        <p>© 2024 Procai — PDF naar UBL Converter | Contact: info@procai.nl</p>
        <p style={{ marginTop: '8px' }}>
          🔒 Zero Data Retention · 🇪🇺 Europese Servers · Peppol BIS 3.0 Compliant
        </p>
      </footer>
    </div>
  );
}
