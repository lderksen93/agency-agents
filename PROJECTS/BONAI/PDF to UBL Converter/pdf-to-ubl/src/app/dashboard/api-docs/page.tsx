'use client';

import { useState } from 'react';

export default function ApiDocsPage() {
    const [copied, setCopied] = useState('');

    const copyCode = (code: string, id: string) => {
        navigator.clipboard.writeText(code);
        setCopied(id);
        setTimeout(() => setCopied(''), 2000);
    };

    const CodeBlock = ({ code, language, id }: { code: string; language: string; id: string }) => (
        <div style={{ position: 'relative', marginBottom: '16px' }}>
            <button
                onClick={() => copyCode(code, id)}
                style={{
                    position: 'absolute', top: '8px', right: '8px', background: 'rgba(139, 92, 246, 0.2)',
                    border: '1px solid rgba(139, 92, 246, 0.3)', borderRadius: '6px', color: 'var(--primary)',
                    padding: '4px 10px', fontSize: '11px', cursor: 'pointer',
                }}
            >
                {copied === id ? '✓ Gekopieerd' : '📋 Kopieer'}
            </button>
            <pre style={{
                background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border)',
                borderRadius: '10px', padding: '16px', fontSize: '12px', lineHeight: '1.6',
                overflow: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all',
            }}>
                <code>{code}</code>
            </pre>
        </div>
    );

    const Endpoint = ({ method, path, description, children }: { method: string; path: string; description: string; children: React.ReactNode }) => (
        <div className="card" style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <span style={{
                    background: method === 'POST' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                    color: method === 'POST' ? '#22c55e' : '#3b82f6',
                    padding: '3px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 700, fontFamily: 'monospace',
                }}>{method}</span>
                <code style={{ fontSize: '14px', fontWeight: 600 }}>{path}</code>
            </div>
            <p style={{ color: 'var(--muted)', fontSize: '13px', marginBottom: '16px' }}>{description}</p>
            {children}
        </div>
    );

    return (
        <div>
            <div style={{ marginBottom: '32px' }}>
                <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '8px' }}>📡 API Documentatie</h1>
                <p style={{ color: 'var(--muted)', fontSize: '14px' }}>
                    Integreer PDF naar UBL conversie in uw applicatie via onze REST API.
                </p>
            </div>

            {/* Authentication */}
            <div className="card" style={{ marginBottom: '24px', borderColor: 'rgba(139, 92, 246, 0.3)' }}>
                <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>🔐 Authenticatie</h2>
                <p style={{ fontSize: '13px', marginBottom: '12px' }}>
                    Gebruik uw API key in de <code>Authorization</code> header. API keys kunt u genereren via{' '}
                    <a href="/dashboard/api-keys" style={{ color: 'var(--primary)' }}>Dashboard → API Keys</a>.
                </p>
                <CodeBlock id="auth" language="bash" code={`Authorization: Bearer prc_sk_uw_api_key_hier`} />
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    {[
                        { icon: '🇪🇺', text: 'EU servers' },
                        { icon: '🔒', text: 'Zero Data Retention' },
                        { icon: '📊', text: 'Credit-based pricing' },
                        { icon: '⚡', text: 'Peppol PINT EU compliant' },
                    ].map((badge, i) => (
                        <span key={i} style={{
                            background: 'rgba(139, 92, 246, 0.08)', border: '1px solid rgba(139, 92, 246, 0.15)',
                            borderRadius: '6px', padding: '4px 10px', fontSize: '11px',
                        }}>{badge.icon} {badge.text}</span>
                    ))}
                </div>
            </div>

            {/* Base URL */}
            <div className="card" style={{ marginBottom: '24px' }}>
                <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>🌐 Base URL</h2>
                <CodeBlock id="base" language="text" code={`https://uw-domein.nl/api/v1`} />
            </div>

            {/* Convert PDF */}
            <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '16px', marginTop: '32px' }}>Endpoints</h2>

            <Endpoint method="POST" path="/api/v1/convert" description="Upload een PDF factuur en ontvang UBL XML terug. Eén credit per factuur.">
                <h4 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: 'var(--primary)' }}>Request Headers</h4>
                <table className="table" style={{ fontSize: '12px', marginBottom: '16px' }}>
                    <thead>
                        <tr><th>Header</th><th>Waarde</th><th>Beschrijving</th></tr>
                    </thead>
                    <tbody>
                        <tr><td><code>Authorization</code></td><td><code>Bearer prc_sk_...</code></td><td>Verplicht — uw API key</td></tr>
                        <tr><td><code>Content-Type</code></td><td><code>multipart/form-data</code></td><td>Verplicht — voor file upload</td></tr>
                        <tr><td><code>Accept</code></td><td><code>application/json</code></td><td>Standaard — JSON response met alle data</td></tr>
                        <tr><td><code>Accept</code></td><td><code>application/xml</code></td><td>Optioneel — direct UBL XML als response</td></tr>
                    </tbody>
                </table>

                <h4 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: 'var(--primary)' }}>Request Body (multipart/form-data)</h4>
                <table className="table" style={{ fontSize: '12px', marginBottom: '16px' }}>
                    <thead>
                        <tr><th>Veld</th><th>Type</th><th>Verplicht</th><th>Beschrijving</th></tr>
                    </thead>
                    <tbody>
                        <tr><td><code>file</code></td><td>File</td><td>✅ Ja</td><td>PDF bestand (max 20MB)</td></tr>
                        <tr><td><code>adminName</code></td><td>String</td><td>Nee</td><td>Bedrijfsnaam afnemer (buyer)</td></tr>
                        <tr><td><code>adminAddress</code></td><td>String</td><td>Nee</td><td>Adres afnemer</td></tr>
                        <tr><td><code>adminKvk</code></td><td>String</td><td>Nee</td><td>KVK-nummer afnemer</td></tr>
                        <tr><td><code>adminIban</code></td><td>String</td><td>Nee</td><td>IBAN afnemer</td></tr>
                    </tbody>
                </table>

                <h4 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: 'var(--primary)' }}>Voorbeeld: JSON Response (standaard)</h4>
                <CodeBlock id="curl-json" language="bash" code={`curl -X POST https://uw-domein.nl/api/v1/convert \\
  -H "Authorization: Bearer prc_sk_uw_api_key" \\
  -F "file=@factuur.pdf"`} />

                <details style={{ marginBottom: '16px' }}>
                    <summary style={{ cursor: 'pointer', fontSize: '13px', fontWeight: 500, color: 'var(--primary)' }}>
                        📄 Voorbeeld JSON Response
                    </summary>
                    <CodeBlock id="json-resp" language="json" code={`{
  "conversionId": "cm1234abc",
  "status": "completed",
  "documentType": "invoice",
  "invoiceCount": 1,
  "creditsUsed": 1,
  "creditsRemaining": 999,
  "results": [
    {
      "invoiceIndex": 0,
      "extractedData": {
        "invoiceNumber": { "value": "2024-001", "confidence": 0.98 },
        "issueDate": { "value": "2024-01-15", "confidence": 0.95 },
        "sellerName": { "value": "Bedrijf B.V.", "confidence": 0.97 },
        "totalNetAmount": { "value": "1000.00", "confidence": 0.96 },
        "totalVatAmount": { "value": "210.00", "confidence": 0.94 },
        "totalGrossAmount": { "value": "1210.00", "confidence": 0.95 }
      },
      "ublXml": "<?xml version=\\"1.0\\" encoding=\\"UTF-8\\"?>\\n<Invoice>...</Invoice>",
      "isValid": true,
      "validationErrors": [],
      "flaggedFields": []
    }
  ],
  "zeroDataRetention": true,
  "processedOnEuServers": true
}`} />
                </details>

                <h4 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: 'var(--primary)' }}>Voorbeeld: Direct XML Response</h4>
                <CodeBlock id="curl-xml" language="bash" code={`curl -X POST https://uw-domein.nl/api/v1/convert \\
  -H "Authorization: Bearer prc_sk_uw_api_key" \\
  -H "Accept: application/xml" \\
  -F "file=@factuur.pdf" \\
  -o factuur_ubl.xml`} />
                <p style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '16px' }}>
                    Bij <code>Accept: application/xml</code> worden metadata als custom headers meegestuurd:
                    <code> X-Conversion-Id</code>, <code>X-Credits-Used</code>, <code>X-Credits-Remaining</code>,
                    <code> X-Document-Type</code>, <code>X-Invoice-Count</code>.
                </p>
            </Endpoint>

            {/* Get Conversion */}
            <Endpoint method="GET" path="/api/v1/convert/{id}" description="Haal de volledige details van een eerdere conversie op.">
                <CodeBlock id="get-conv" language="bash" code={`curl https://uw-domein.nl/api/v1/convert/cm1234abc \\
  -H "Authorization: Bearer prc_sk_uw_api_key"`} />
            </Endpoint>

            {/* Download XML */}
            <Endpoint method="GET" path="/api/v1/convert/{id}/download?index=0" description="Download de gegenereerde UBL XML als bestand.">
                <CodeBlock id="download" language="bash" code={`curl https://uw-domein.nl/api/v1/convert/cm1234abc/download?index=0 \\
  -H "Authorization: Bearer prc_sk_uw_api_key" \\
  -o factuur_ubl.xml`} />
                <table className="table" style={{ fontSize: '12px', marginBottom: '16px' }}>
                    <thead>
                        <tr><th>Parameter</th><th>Type</th><th>Beschrijving</th></tr>
                    </thead>
                    <tbody>
                        <tr><td><code>index</code></td><td>Integer</td><td>Factuur index bij multi-invoice PDF (standaard: 0)</td></tr>
                    </tbody>
                </table>
            </Endpoint>

            {/* Credits */}
            <Endpoint method="GET" path="/api/v1/credits" description="Controleer uw credit saldo.">
                <CodeBlock id="credits" language="bash" code={`curl https://uw-domein.nl/api/v1/credits \\
  -H "Authorization: Bearer prc_sk_uw_api_key"`} />
                <details>
                    <summary style={{ cursor: 'pointer', fontSize: '13px', fontWeight: 500, color: 'var(--primary)' }}>
                        📄 Voorbeeld Response
                    </summary>
                    <CodeBlock id="credits-resp" language="json" code={`{
  "balance": 997,
  "totalUsed": 3,
  "limit": 1000
}`} />
                </details>
            </Endpoint>

            {/* Conversions List */}
            <Endpoint method="GET" path="/api/v1/conversions" description="Lijst van recente conversies voor uw organisatie.">
                <CodeBlock id="conversions" language="bash" code={`curl https://uw-domein.nl/api/v1/conversions \\
  -H "Authorization: Bearer prc_sk_uw_api_key"`} />
            </Endpoint>

            {/* Error Codes */}
            <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '16px', marginTop: '32px' }}>Foutcodes</h2>
            <div className="card" style={{ marginBottom: '24px' }}>
                <table className="table" style={{ fontSize: '12px' }}>
                    <thead>
                        <tr><th>HTTP</th><th>Code</th><th>Beschrijving</th></tr>
                    </thead>
                    <tbody>
                        <tr><td>400</td><td><code>no_file</code></td><td>Geen PDF bestand meegegeven</td></tr>
                        <tr><td>400</td><td><code>file_too_large</code></td><td>Bestand groter dan 20MB</td></tr>
                        <tr><td>400</td><td><code>invalid_format</code></td><td>Geen PDF bestand</td></tr>
                        <tr><td>401</td><td><code>unauthorized</code></td><td>Ongeldige of ontbrekende API key</td></tr>
                        <tr><td>402</td><td><code>credit_limit_reached</code></td><td>Geen credits meer beschikbaar</td></tr>
                        <tr><td>404</td><td><code>not_found</code></td><td>Conversie niet gevonden</td></tr>
                        <tr><td>500</td><td><code>processing_error</code></td><td>Verwerkingsfout</td></tr>
                    </tbody>
                </table>
            </div>

            {/* Code Examples */}
            <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '16px', marginTop: '32px' }}>Code Voorbeelden</h2>

            <div className="card" style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>🐍 Python</h3>
                <CodeBlock id="python" language="python" code={`import requests

API_KEY = "prc_sk_uw_api_key"
BASE_URL = "https://uw-domein.nl/api/v1"

# Optie 1: JSON response met alle data
response = requests.post(
    f"{BASE_URL}/convert",
    headers={"Authorization": f"Bearer {API_KEY}"},
    files={"file": open("factuur.pdf", "rb")}
)
data = response.json()
ubl_xml = data["results"][0]["ublXml"]

# Optie 2: Direct XML response
response = requests.post(
    f"{BASE_URL}/convert",
    headers={
        "Authorization": f"Bearer {API_KEY}",
        "Accept": "application/xml"
    },
    files={"file": open("factuur.pdf", "rb")}
)
with open("factuur_ubl.xml", "wb") as f:
    f.write(response.content)`} />
            </div>

            <div className="card" style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>🟢 Node.js</h3>
                <CodeBlock id="nodejs" language="javascript" code={`const fs = require('fs');
const FormData = require('form-data');

const API_KEY = 'prc_sk_uw_api_key';
const BASE_URL = 'https://uw-domein.nl/api/v1';

const form = new FormData();
form.append('file', fs.createReadStream('factuur.pdf'));

// Optie 1: JSON response
const response = await fetch(\`\${BASE_URL}/convert\`, {
  method: 'POST',
  headers: { 'Authorization': \`Bearer \${API_KEY}\` },
  body: form,
});
const data = await response.json();
console.log(data.results[0].ublXml);

// Optie 2: Direct XML
const xmlResponse = await fetch(\`\${BASE_URL}/convert\`, {
  method: 'POST',
  headers: {
    'Authorization': \`Bearer \${API_KEY}\`,
    'Accept': 'application/xml',
  },
  body: form,
});
fs.writeFileSync('output.xml', await xmlResponse.text());`} />
            </div>

            <div className="card" style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>💻 C# / .NET</h3>
                <CodeBlock id="csharp" language="csharp" code={`using var client = new HttpClient();
client.DefaultRequestHeaders.Add("Authorization", "Bearer prc_sk_uw_api_key");
client.DefaultRequestHeaders.Add("Accept", "application/xml");

using var content = new MultipartFormDataContent();
content.Add(new StreamContent(File.OpenRead("factuur.pdf")), "file", "factuur.pdf");

var response = await client.PostAsync("https://uw-domein.nl/api/v1/convert", content);
var xml = await response.Content.ReadAsStringAsync();
File.WriteAllText("factuur_ubl.xml", xml);`} />
            </div>

            {/* Rate Limits */}
            <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '16px', marginTop: '32px' }}>Limieten</h2>
            <div className="card" style={{ marginBottom: '24px' }}>
                <table className="table" style={{ fontSize: '13px' }}>
                    <tbody>
                        <tr><td style={{ fontWeight: 500 }}>Max bestandsgrootte</td><td>20 MB</td></tr>
                        <tr><td style={{ fontWeight: 500 }}>Ondersteunde formaten</td><td>PDF</td></tr>
                        <tr><td style={{ fontWeight: 500 }}>Credits per factuur</td><td>1 credit</td></tr>
                        <tr><td style={{ fontWeight: 500 }}>UBL standaard</td><td>Peppol PINT EU (UBL 2.1)</td></tr>
                        <tr><td style={{ fontWeight: 500 }}>Data opslag</td><td>Zero Data Retention</td></tr>
                        <tr><td style={{ fontWeight: 500 }}>Serverlocatie</td><td>EU (via OpenRouter EU routing)</td></tr>
                    </tbody>
                </table>
            </div>

            {/* EU Banner */}
            <div className="zero-data-banner">
                🔒 <strong>Zero Data Retention</strong> — Alle documenten worden direct na verwerking verwijderd.
                🇪🇺 Verwerking op Europese servers. Peppol PINT EU compliant output.
            </div>
        </div>
    );
}
