const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const BASE = 'http://localhost:3000/api/v1';
const results = [];

async function main() {
    const db = new Database(path.resolve(__dirname, 'prisma/dev.db'), { readonly: true });
    const k = db.prepare('SELECT key FROM ApiKey WHERE isActive = 1').get();
    db.close();
    const KEY = k.key;
    const h = { 'Authorization': 'Bearer ' + KEY };

    // 1. Credits
    let r = await fetch(BASE + '/credits', { headers: h });
    let d = await r.json();
    results.push({ test: 'Credits', status: r.status, pass: r.status===200, data: d });

    // 2. Conversions
    r = await fetch(BASE + '/conversions', { headers: h });
    d = await r.json();
    results.push({ test: 'Conversions', status: r.status, pass: r.status===200, count: Array.isArray(d)?d.length:'N/A' });

    // 3. Find PDF
    const pdfs = fs.readdirSync(__dirname).filter(f => f.endsWith('.pdf'));
    if (pdfs.length === 0) { results.push({ test: 'Convert', skip: true }); }
    else {
        const buf = fs.readFileSync(path.resolve(__dirname, pdfs[0]));
        
        // 3. Convert JSON
        let form = new FormData();
        form.append('file', new Blob([buf], {type:'application/pdf'}), pdfs[0]);
        r = await fetch(BASE + '/convert', { method:'POST', headers:h, body:form });
        d = await r.json();
        results.push({ test:'Convert-JSON', status:r.status, pass:r.status===200, convId:d.conversionId, hasXml:!!(d.results&&d.results[0]&&d.results[0].ublXml), credits:d.creditsUsed });

        // 4. Detail
        if (d.conversionId) {
            r = await fetch(BASE + '/convert/' + d.conversionId, { headers: h });
            let det = await r.json();
            results.push({ test:'Detail', status:r.status, pass:r.status===200, results:det.results?det.results.length:0 });

            // 5. Download
            r = await fetch(BASE + '/convert/' + d.conversionId + '/download?index=0', { headers: h });
            let xml = await r.text();
            results.push({ test:'Download-XML', status:r.status, pass:r.status===200&&xml.startsWith('<?xml'), contentType:r.headers.get('content-type'), xmlLen:xml.length });
        }

        // 6. Direct XML
        form = new FormData();
        form.append('file', new Blob([buf], {type:'application/pdf'}), pdfs[0]);
        r = await fetch(BASE + '/convert', { method:'POST', headers:{...h, 'Accept':'application/xml'}, body:form });
        let xmlBody = await r.text();
        results.push({ test:'Direct-XML', status:r.status, pass:r.status===200&&xmlBody.startsWith('<?xml'), contentType:r.headers.get('content-type'), xConvId:r.headers.get('x-conversion-id'), hasPINT:xmlBody.includes('pint:billing'), xmlLen:xmlBody.length });
    }

    // 7. Auth fail
    r = await fetch(BASE + '/credits', { headers: { 'Authorization': 'Bearer prc_sk_bad' } });
    d = await r.json();
    results.push({ test:'Auth-Fail', status:r.status, pass:r.status===401, error:d.error });

    // Write results as JSON
    fs.writeFileSync(path.resolve(__dirname, 'test-results.json'), JSON.stringify(results, null, 2), 'utf8');
    process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
