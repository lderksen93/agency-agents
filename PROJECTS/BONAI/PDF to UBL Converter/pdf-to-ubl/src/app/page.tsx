import Link from 'next/link';
import { Shield, Server, Zap, FileCheck, ChartBar as BarChart3, Code as Code2, Lock, Globe } from 'lucide-react';

export default function LandingPage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#ffffff' }}>
      <nav style={{
        padding: '16px 40px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid var(--border)',
        background: '#ffffff',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontWeight: 700, fontSize: '20px', color: 'var(--foreground)' }}>Bonai</span>
          <span style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 400 }}>powered by Procai</span>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <Link href="/login" className="btn-secondary" style={{ padding: '8px 20px' }}>Inloggen</Link>
          <Link href="/register" className="btn-primary" style={{ padding: '8px 20px' }}>Registreren</Link>
        </div>
      </nav>

      <section style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '80px 40px',
      }}>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginBottom: '28px' }}>
          <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <Lock size={12} /> Zero Data Retention
          </span>
          <span className="badge badge-info" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <Globe size={12} /> Europese Servers
          </span>
        </div>

        <h1 style={{
          fontSize: '44px', fontWeight: 700, lineHeight: 1.15, marginBottom: '20px',
          color: 'var(--foreground)', maxWidth: '720px',
        }}>
          PDF Facturen naar UBL XML in Seconden
        </h1>

        <p style={{
          fontSize: '17px', color: 'var(--muted)', maxWidth: '560px',
          marginBottom: '36px', lineHeight: 1.7,
        }}>
          Converteer uw PDF-facturen automatisch naar gevalideerde UBL XML
          (Peppol BIS 3.0 / EN 16931). Met AI-extractie, per-veld zekerheidsscores
          en volledige privacy-garantie.
        </p>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <Link href="/register" className="btn-primary" style={{ padding: '14px 32px', fontSize: '15px' }}>
            Gratis Starten — 1000 Credits
          </Link>
          <Link href="/login" className="btn-secondary" style={{ padding: '14px 32px', fontSize: '15px' }}>
            API Documentatie
          </Link>
        </div>
      </section>

      <section style={{ padding: '64px 40px', maxWidth: '1100px', margin: '0 auto', width: '100%' }}>
        <h2 style={{ textAlign: 'center', fontSize: '28px', fontWeight: 600, marginBottom: '40px', color: 'var(--foreground)' }}>
          Waarom Bonai?
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
          {[
            { icon: Zap, title: 'AI-Gestuurde Extractie', desc: 'Kies uw AI-provider: Google Document AI of OpenRouter met modellen zoals Gemini, Claude of Llama. Admin selecteert het model.' },
            { icon: BarChart3, title: 'Per-Veld Zekerheidsscores', desc: 'Elk geextraheerd veld krijgt een confidence score (0-100%). Onzekere velden worden automatisch gemarkeerd voor menselijke controle.' },
            { icon: FileCheck, title: 'Peppol BIS 3.0 Compliant', desc: 'Gegenereerde UBL XML wordt gevalideerd tegen Schematron en XSD regels. Volledig conform EN 16931 en Peppol BIS Billing 3.0.' },
            { icon: Shield, title: 'Zero Data Retention', desc: 'Geen documenten worden opgeslagen na verwerking. Uw factuurdata wordt onmiddellijk uit het geheugen gewist na conversie.' },
            { icon: Server, title: 'Europese Servers', desc: 'Alle AI-verwerking vindt uitsluitend plaats op Europese servers. Volledige GDPR-compliance voor uw factuurverwerking.' },
            { icon: Code2, title: 'REST API', desc: 'Integreer PDF-naar-UBL conversie in uw eigen software met onze eenvoudige REST API. API key-beheer via het dashboard.' },
          ].map((feature) => (
            <div key={feature.title} className="card">
              <feature.icon size={24} style={{ color: 'var(--primary)', marginBottom: '14px' }} />
              <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>{feature.title}</h3>
              <p style={{ color: 'var(--muted)', fontSize: '14px', lineHeight: 1.6 }}>{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer style={{
        borderTop: '1px solid var(--border)',
        padding: '32px 40px',
        textAlign: 'center',
        color: 'var(--muted)',
        fontSize: '13px',
        background: '#ffffff',
      }}>
        <p>Bonai B.V. — Oranjesingel 60, 6511 NY Nijmegen | info@bonai.nl</p>
        <p style={{ marginTop: '6px', display: 'flex', gap: '16px', justifyContent: 'center', alignItems: 'center' }}>
          <span>Zero Data Retention</span>
          <span>Europese Servers</span>
          <span>Peppol BIS 3.0</span>
        </p>
      </footer>
    </div>
  );
}
