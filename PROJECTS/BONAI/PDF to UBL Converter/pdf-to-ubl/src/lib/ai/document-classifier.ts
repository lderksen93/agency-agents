/**
 * Classificeert of een document een factuur, creditnota of iets anders is.
 * Detecteert aanmaningen, bankafschriften, etc.
 */

export const NON_INVOICE_PATTERNS: Record<string, string[]> = {
    aanmaning: [
        'aanmaning', 'betalingsherinnering', 'herinnering', 'payment reminder',
        'eerste aanmaning', 'tweede aanmaning', 'laatste aanmaning',
        'incasso', 'sommatie',
    ],
    bankafschrift: [
        'bankafschrift', 'rekeningoverzicht', 'bank statement',
        'transactieoverzicht', 'dagafschrift', 'account statement',
    ],
    offerte: [
        'offerte', 'quotation', 'quote', 'aanbieding', 'proforma',
    ],
    pakbon: [
        'pakbon', 'afleverbon', 'delivery note', 'packing slip',
    ],
};

export type NonInvoiceCategory = keyof typeof NON_INVOICE_PATTERNS;

/**
 * Quick pre-check: scan text content for non-invoice patterns.
 * This runs BEFORE AI extraction as a fast filter.
 */
export function classifyDocumentText(text: string): {
    isLikelyInvoice: boolean;
    detectedCategory?: NonInvoiceCategory;
    matchedPatterns: string[];
} {
    const lowerText = text.toLowerCase();

    for (const [category, patterns] of Object.entries(NON_INVOICE_PATTERNS)) {
        const matched = patterns.filter(p => lowerText.includes(p));
        if (matched.length > 0) {
            // Check for invoice indicators that override
            const invoiceIndicators = [
                'factuurnummer', 'invoice number', 'factuur', 'invoice',
                'btw', 'vat', 'totaal', 'total',
            ];
            const hasInvoiceIndicators = invoiceIndicators.filter(i => lowerText.includes(i));

            // If more non-invoice patterns than invoice indicators, classify as non-invoice
            if (matched.length >= hasInvoiceIndicators.length) {
                return {
                    isLikelyInvoice: false,
                    detectedCategory: category as NonInvoiceCategory,
                    matchedPatterns: matched,
                };
            }
        }
    }

    return { isLikelyInvoice: true, matchedPatterns: [] };
}
