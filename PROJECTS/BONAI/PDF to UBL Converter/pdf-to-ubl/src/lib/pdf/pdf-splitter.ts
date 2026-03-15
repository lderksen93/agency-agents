import { PDFDocument } from 'pdf-lib';

export interface SplitResult {
    invoiceCount: number;
    pdfBuffers: Buffer[];
    splitConfidence: number;
}

/**
 * Detects and splits multi-invoice PDFs.
 * For now, treats each PDF as a single invoice.
 * Multi-invoice detection is done by the AI layer.
 */
export class PdfSplitter {

    async detectAndSplit(pdfBuffer: Buffer): Promise<SplitResult> {
        const pdfDoc = await PDFDocument.load(pdfBuffer);
        const pageCount = pdfDoc.getPageCount();

        // For single page PDFs, no splitting needed
        if (pageCount <= 1) {
            return {
                invoiceCount: 1,
                pdfBuffers: [pdfBuffer],
                splitConfidence: 1.0,
            };
        }

        // For multi-page PDFs, return as single document
        // AI will detect if there are multiple invoices
        return {
            invoiceCount: 1,
            pdfBuffers: [pdfBuffer],
            splitConfidence: 0.8,
        };
    }

    /**
     * Split a PDF at specified page boundaries.
     * @param pdfBuffer Full PDF buffer
     * @param pageGroups Array of page index arrays, e.g. [[0,1], [2,3]]
     */
    async splitAtPages(pdfBuffer: Buffer, pageGroups: number[][]): Promise<Buffer[]> {
        const sourcePdf = await PDFDocument.load(pdfBuffer);
        const buffers: Buffer[] = [];

        for (const group of pageGroups) {
            const newPdf = await PDFDocument.create();
            const pages = await newPdf.copyPages(sourcePdf, group);
            for (const page of pages) {
                newPdf.addPage(page);
            }
            const bytes = await newPdf.save();
            buffers.push(Buffer.from(bytes));
        }

        return buffers;
    }

    /**
     * Get basic PDF info without full processing.
     */
    async getInfo(pdfBuffer: Buffer): Promise<{ pageCount: number; fileSize: number }> {
        const pdfDoc = await PDFDocument.load(pdfBuffer);
        return {
            pageCount: pdfDoc.getPageCount(),
            fileSize: pdfBuffer.length,
        };
    }
}
