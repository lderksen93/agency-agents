const http = require('http');
const fs = require('fs');
const path = require('path');

async function test() {
    const pdfPath = path.resolve(__dirname, 'test-invoice.pdf');
    const pdfBuffer = fs.readFileSync(pdfPath);
    console.log('PDF size:', pdfBuffer.length, 'bytes');

    // Get CSRF token
    const csrfRes = await fetch('http://localhost:3000/api/auth/csrf');
    const csrfData = await csrfRes.json();
    const csrfToken = csrfData.csrfToken;
    const cookies = csrfRes.headers.getSetCookie();

    // Login
    const loginRes = await fetch('http://localhost:3000/api/auth/callback/credentials', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Cookie': cookies.join('; '),
        },
        body: `csrfToken=${csrfToken}&email=admin@test.nl&password=testtest123`,
        redirect: 'manual',
    });

    const loginCookies = loginRes.headers.getSetCookie();
    const allCookies = [...cookies, ...loginCookies].join('; ');
    console.log('Login OK');

    // Upload PDF
    const boundary = '----FormBoundary' + Math.random().toString(36).substr(2);
    const formParts = [
        `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="test-invoice.pdf"\r\nContent-Type: application/pdf\r\n\r\n`,
        pdfBuffer,
        `\r\n--${boundary}--\r\n`,
    ];

    const body = Buffer.concat([
        Buffer.from(formParts[0]),
        formParts[1],
        Buffer.from(formParts[2]),
    ]);

    console.log('Sending conversion request...');
    const convertRes = await fetch('http://localhost:3000/api/v1/convert', {
        method: 'POST',
        headers: {
            'Cookie': allCookies,
            'Content-Type': `multipart/form-data; boundary=${boundary}`,
        },
        body: body,
    });

    const result = await convertRes.json();
    console.log('\nStatus:', convertRes.status);
    console.log('Result:', JSON.stringify(result, null, 2));
}

test().catch(e => console.error('Test error:', e));
