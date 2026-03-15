const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

async function createTestInvoice() {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]); // A4
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const { width, height } = page.getSize();
    let yPos = height - 60;

    // Header
    page.drawText('FACTUUR', { x: 50, y: yPos, size: 28, font: boldFont, color: rgb(0.1, 0.1, 0.5) });
    yPos -= 40;

    // Seller info
    page.drawText('Van:', { x: 50, y: yPos, size: 10, font: boldFont });
    yPos -= 16;
    page.drawText('Test Bedrijf BV', { x: 50, y: yPos, size: 10, font: font });
    yPos -= 14;
    page.drawText('Keizersgracht 125', { x: 50, y: yPos, size: 10, font: font });
    yPos -= 14;
    page.drawText('1015 CJ Amsterdam', { x: 50, y: yPos, size: 10, font: font });
    yPos -= 14;
    page.drawText('KVK: 12345678', { x: 50, y: yPos, size: 10, font: font });
    yPos -= 14;
    page.drawText('BTW: NL123456789B01', { x: 50, y: yPos, size: 10, font: font });
    yPos -= 14;
    page.drawText('IBAN: NL91ABNA0417164300', { x: 50, y: yPos, size: 10, font: font });

    // Buyer info
    let buyerY = height - 100;
    page.drawText('Aan:', { x: 350, y: buyerY, size: 10, font: boldFont });
    buyerY -= 16;
    page.drawText('Klant Beheer B.V.', { x: 350, y: buyerY, size: 10, font: font });
    buyerY -= 14;
    page.drawText('Herengracht 200', { x: 350, y: buyerY, size: 10, font: font });
    buyerY -= 14;
    page.drawText('1016 BS Amsterdam', { x: 350, y: buyerY, size: 10, font: font });
    buyerY -= 14;
    page.drawText('KVK: 87654321', { x: 350, y: buyerY, size: 10, font: font });
    buyerY -= 14;
    page.drawText('BTW: NL987654321B01', { x: 350, y: buyerY, size: 10, font: font });

    // Invoice details
    yPos -= 40;
    page.drawText('Factuurnummer:', { x: 50, y: yPos, size: 10, font: boldFont });
    page.drawText('INV-2026-0042', { x: 180, y: yPos, size: 10, font: font });
    yPos -= 16;
    page.drawText('Factuurdatum:', { x: 50, y: yPos, size: 10, font: boldFont });
    page.drawText('13-03-2026', { x: 180, y: yPos, size: 10, font: font });
    yPos -= 16;
    page.drawText('Vervaldatum:', { x: 50, y: yPos, size: 10, font: boldFont });
    page.drawText('13-04-2026', { x: 180, y: yPos, size: 10, font: font });
    yPos -= 16;
    page.drawText('Betaaltermijn:', { x: 50, y: yPos, size: 10, font: boldFont });
    page.drawText('30 dagen', { x: 180, y: yPos, size: 10, font: font });

    // Line items header
    yPos -= 40;
    page.drawText('Omschrijving', { x: 50, y: yPos, size: 10, font: boldFont });
    page.drawText('Aantal', { x: 280, y: yPos, size: 10, font: boldFont });
    page.drawText('Prijs', { x: 350, y: yPos, size: 10, font: boldFont });
    page.drawText('BTW', { x: 420, y: yPos, size: 10, font: boldFont });
    page.drawText('Totaal', { x: 480, y: yPos, size: 10, font: boldFont });
    yPos -= 4;
    page.drawLine({ start: { x: 50, y: yPos }, end: { x: 545, y: yPos }, thickness: 1, color: rgb(0.7, 0.7, 0.7) });

    // Line item 1
    yPos -= 18;
    page.drawText('Website ontwikkeling', { x: 50, y: yPos, size: 10, font: font });
    page.drawText('1', { x: 290, y: yPos, size: 10, font: font });
    page.drawText('2.500,00', { x: 340, y: yPos, size: 10, font: font });
    page.drawText('21%', { x: 425, y: yPos, size: 10, font: font });
    page.drawText('2.500,00', { x: 475, y: yPos, size: 10, font: font });

    // Line item 2
    yPos -= 18;
    page.drawText('Hosting (12 maanden)', { x: 50, y: yPos, size: 10, font: font });
    page.drawText('12', { x: 290, y: yPos, size: 10, font: font });
    page.drawText('25,00', { x: 340, y: yPos, size: 10, font: font });
    page.drawText('21%', { x: 425, y: yPos, size: 10, font: font });
    page.drawText('300,00', { x: 475, y: yPos, size: 10, font: font });

    // Line item 3
    yPos -= 18;
    page.drawText('SEO Optimalisatie', { x: 50, y: yPos, size: 10, font: font });
    page.drawText('1', { x: 290, y: yPos, size: 10, font: font });
    page.drawText('750,00', { x: 340, y: yPos, size: 10, font: font });
    page.drawText('21%', { x: 425, y: yPos, size: 10, font: font });
    page.drawText('750,00', { x: 475, y: yPos, size: 10, font: font });

    // Totals
    yPos -= 30;
    page.drawLine({ start: { x: 350, y: yPos + 10 }, end: { x: 545, y: yPos + 10 }, thickness: 1, color: rgb(0.7, 0.7, 0.7) });
    page.drawText('Subtotaal:', { x: 350, y: yPos, size: 10, font: font });
    page.drawText('3.550,00', { x: 475, y: yPos, size: 10, font: font });
    yPos -= 18;
    page.drawText('BTW 21%:', { x: 350, y: yPos, size: 10, font: font });
    page.drawText('745,50', { x: 475, y: yPos, size: 10, font: font });
    yPos -= 20;
    page.drawLine({ start: { x: 350, y: yPos + 10 }, end: { x: 545, y: yPos + 10 }, thickness: 2, color: rgb(0.1, 0.1, 0.5) });
    page.drawText('Totaal:', { x: 350, y: yPos, size: 14, font: boldFont, color: rgb(0.1, 0.1, 0.5) });
    page.drawText('EUR 4.295,50', { x: 450, y: yPos, size: 14, font: boldFont, color: rgb(0.1, 0.1, 0.5) });

    // Payment info
    yPos -= 50;
    page.drawText('Betalingsinformatie:', { x: 50, y: yPos, size: 10, font: boldFont });
    yPos -= 16;
    page.drawText('Gelieve het totaalbedrag binnen 30 dagen over te maken op:', { x: 50, y: yPos, size: 10, font: font });
    yPos -= 14;
    page.drawText('IBAN: NL91ABNA0417164300', { x: 50, y: yPos, size: 10, font: font });
    yPos -= 14;
    page.drawText('t.n.v. Test Bedrijf BV', { x: 50, y: yPos, size: 10, font: font });
    yPos -= 14;
    page.drawText('o.v.v. INV-2026-0042', { x: 50, y: yPos, size: 10, font: font });

    const pdfBytes = await pdfDoc.save();
    const outPath = path.resolve(__dirname, 'test-invoice.pdf');
    fs.writeFileSync(outPath, pdfBytes);
    console.log('Test invoice created:', outPath);
    console.log('Size:', pdfBytes.length, 'bytes');
}

createTestInvoice().catch(console.error);
