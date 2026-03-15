import { ExtractionResult, ScoredConversion } from '@/types/extraction';

export const CONFIDENCE_THRESHOLD = parseFloat(process.env.CONFIDENCE_THRESHOLD || '0.85');

/**
 * Scores extraction results and flags low-confidence fields for review.
 * Performs cross-validation checks on totals, VAT, IBAN, and dates.
 */
export class ConfidenceScorer {
    private threshold: number;

    constructor(threshold?: number) {
        this.threshold = threshold ?? CONFIDENCE_THRESHOLD;
    }

    scoreExtraction(extraction: ExtractionResult): ScoredConversion {
        if (extraction.invoices.length === 0) {
            return {
                overallConfidence: 0,
                flaggedFields: [],
                flaggedForReview: true,
            };
        }

        const flaggedFields: string[] = [];
        const invoice = extraction.invoices[0];

        // Check each field against threshold
        for (const [fieldName, field] of Object.entries(invoice.fields)) {
            if (field.confidence < this.threshold) {
                flaggedFields.push(fieldName);
                field.needsReview = true;
                field.reviewReason = `Zekerheid ${Math.round(field.confidence * 100)}% — onder drempel van ${Math.round(this.threshold * 100)}%`;
            }
        }

        // Cross-validation checks
        this.validateTotals(extraction, flaggedFields);
        this.validateVatCalculation(extraction, flaggedFields);
        this.validateDates(extraction, flaggedFields);
        this.validateIban(extraction, flaggedFields);
        this.validateVatNumber(extraction, flaggedFields);

        const overallConfidence = this.calculateOverallConfidence(extraction);

        return {
            overallConfidence,
            flaggedFields: [...new Set(flaggedFields)], // Remove duplicates
            flaggedForReview: flaggedFields.length > 0,
        };
    }

    /**
     * Check if line totals sum to invoice total
     */
    private validateTotals(extraction: ExtractionResult, flaggedFields: string[]) {
        const invoice = extraction.invoices[0];
        if (!invoice.lineItems || invoice.lineItems.length === 0) return;

        const totalNet = Number(invoice.fields.totalNetAmount?.value) || 0;
        const lineSum = invoice.lineItems.reduce((sum, line) => {
            return sum + (Number(line.lineNetAmount?.value) || 0);
        }, 0);

        if (totalNet > 0 && Math.abs(totalNet - lineSum) > 0.02) {
            flaggedFields.push('totalNetAmount');
            if (invoice.fields.totalNetAmount) {
                invoice.fields.totalNetAmount.needsReview = true;
                invoice.fields.totalNetAmount.reviewReason =
                    `Regeltotalen (€${lineSum.toFixed(2)}) komen niet overeen met factuurtotaal (€${totalNet.toFixed(2)})`;
            }
        }
    }

    /**
     * Check VAT calculations: totalNet * vatRate = totalVat
     */
    private validateVatCalculation(extraction: ExtractionResult, flaggedFields: string[]) {
        const invoice = extraction.invoices[0];
        const totalNet = Number(invoice.fields.totalNetAmount?.value) || 0;
        const totalVat = Number(invoice.fields.totalVatAmount?.value) || 0;
        const totalGross = Number(invoice.fields.totalGrossAmount?.value) || 0;

        // Check net + vat = gross
        if (totalNet > 0 && totalVat > 0 && totalGross > 0) {
            const expectedGross = totalNet + totalVat;
            if (Math.abs(expectedGross - totalGross) > 0.02) {
                flaggedFields.push('totalGrossAmount');
                if (invoice.fields.totalGrossAmount) {
                    invoice.fields.totalGrossAmount.needsReview = true;
                    invoice.fields.totalGrossAmount.reviewReason =
                        `Netto (€${totalNet.toFixed(2)}) + BTW (€${totalVat.toFixed(2)}) ≠ Bruto (€${totalGross.toFixed(2)})`;
                }
            }
        }

        // Validate per VAT breakdown
        if (invoice.vatBreakdown) {
            for (const vb of invoice.vatBreakdown) {
                const taxable = Number(vb.taxableAmount?.value) || 0;
                const rate = Number(vb.vatRate?.value) || 0;
                const tax = Number(vb.taxAmount?.value) || 0;

                if (taxable > 0 && rate > 0) {
                    const expectedTax = taxable * (rate / 100);
                    if (Math.abs(expectedTax - tax) > 0.05) {
                        flaggedFields.push('totalVatAmount');
                    }
                }
            }
        }
    }

    /**
     * Check date validity and logic
     */
    private validateDates(extraction: ExtractionResult, flaggedFields: string[]) {
        const invoice = extraction.invoices[0];
        const issueDate = invoice.fields.issueDate?.value;
        const dueDate = invoice.fields.dueDate?.value;

        if (issueDate) {
            const issue = new Date(String(issueDate));
            if (isNaN(issue.getTime())) {
                flaggedFields.push('issueDate');
                if (invoice.fields.issueDate) {
                    invoice.fields.issueDate.needsReview = true;
                    invoice.fields.issueDate.reviewReason = 'Ongeldige datum';
                }
            }
        }

        if (dueDate && issueDate) {
            const due = new Date(String(dueDate));
            const issue = new Date(String(issueDate));
            if (due < issue) {
                flaggedFields.push('dueDate');
                if (invoice.fields.dueDate) {
                    invoice.fields.dueDate.needsReview = true;
                    invoice.fields.dueDate.reviewReason = 'Vervaldatum ligt vóór factuurdatum';
                }
            }
        }
    }

    /**
     * Validate IBAN checksum
     */
    private validateIban(extraction: ExtractionResult, flaggedFields: string[]) {
        const invoice = extraction.invoices[0];
        const iban = invoice.fields.sellerIban?.value;

        if (iban && typeof iban === 'string') {
            const cleaned = iban.replace(/\s/g, '').toUpperCase();
            if (cleaned.length < 15 || cleaned.length > 34) {
                flaggedFields.push('sellerIban');
                if (invoice.fields.sellerIban) {
                    invoice.fields.sellerIban.needsReview = true;
                    invoice.fields.sellerIban.reviewReason = `IBAN lengte ongeldig: ${cleaned.length} tekens`;
                }
            } else if (!this.isValidIban(cleaned)) {
                flaggedFields.push('sellerIban');
                if (invoice.fields.sellerIban) {
                    invoice.fields.sellerIban.needsReview = true;
                    invoice.fields.sellerIban.reviewReason = 'IBAN checksum ongeldig';
                }
            }
        }
    }

    private isValidIban(iban: string): boolean {
        // Move first 4 chars to end
        const rearranged = iban.substring(4) + iban.substring(0, 4);

        // Replace letters with numbers (A=10, B=11, etc.)
        let numericStr = '';
        for (const char of rearranged) {
            if (char >= 'A' && char <= 'Z') {
                numericStr += (char.charCodeAt(0) - 55).toString();
            } else {
                numericStr += char;
            }
        }

        // Mod 97 check
        let remainder = 0;
        for (const char of numericStr) {
            remainder = (remainder * 10 + parseInt(char)) % 97;
        }

        return remainder === 1;
    }

    /**
     * Validate VAT number format (basic check)
     */
    private validateVatNumber(extraction: ExtractionResult, flaggedFields: string[]) {
        const invoice = extraction.invoices[0];
        const vatNumber = invoice.fields.sellerVatNumber?.value;

        if (vatNumber && typeof vatNumber === 'string') {
            // Dutch VAT number format: NL followed by 9 digits and B + 2 digits
            const nlPattern = /^NL\d{9}B\d{2}$/;
            // Generic EU VAT number: 2 letter country code + digits/letters
            const euPattern = /^[A-Z]{2}[A-Z0-9]{2,13}$/;

            const cleaned = vatNumber.replace(/[\s.]/g, '').toUpperCase();

            if (!nlPattern.test(cleaned) && !euPattern.test(cleaned)) {
                flaggedFields.push('sellerVatNumber');
                if (invoice.fields.sellerVatNumber) {
                    invoice.fields.sellerVatNumber.needsReview = true;
                    invoice.fields.sellerVatNumber.reviewReason = 'BTW-nummer formaat lijkt ongeldig';
                }
            }
        }
    }

    private calculateOverallConfidence(extraction: ExtractionResult): number {
        if (extraction.invoices.length === 0) return 0;

        const invoice = extraction.invoices[0];
        const values = Object.values(invoice.fields)
            .map(f => f.confidence)
            .filter(c => c > 0);

        if (values.length === 0) return 0;
        return values.reduce((a, b) => a + b, 0) / values.length;
    }
}
