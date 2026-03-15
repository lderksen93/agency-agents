import { AiProvider } from './provider-factory';
import { ExtractionResult, OrgAiConfig } from '@/types/extraction';

/**
 * Google Document AI Invoice Parser integration.
 * Uses EU endpoint for GDPR compliance.
 * 
 * NOTE: Requires @google-cloud/documentai package to be installed:
 * npm install @google-cloud/documentai
 */
export class DocumentAiProvider implements AiProvider {
    private projectId: string;
    private location: string;
    private processorId: string;

    constructor(config: OrgAiConfig) {
        this.projectId = config.documentAiProjectId || '';
        this.location = config.documentAiLocation || 'eu';
        this.processorId = config.documentAiProcessorId || '';
    }

    async extract(pdfBuffer: Buffer): Promise<ExtractionResult> {
        // Use eval to prevent webpack from attempting static analysis
        let client: any;
        try {
            // eslint-disable-next-line no-eval
            const mod = await (eval('import("@google-cloud/documentai")') as Promise<any>);
            const { DocumentProcessorServiceClient } = mod;
            client = new DocumentProcessorServiceClient({
                apiEndpoint: `${this.location}-documentai.googleapis.com`,
            });
        } catch {
            throw new Error(
                'Google Document AI package is niet geïnstalleerd. ' +
                'Installeer met: npm install @google-cloud/documentai'
            );
        }

        const name = `projects/${this.projectId}/locations/${this.location}/processors/${this.processorId}`;

        const [result] = await client.processDocument({
            name,
            rawDocument: {
                content: pdfBuffer.toString('base64'),
                mimeType: 'application/pdf',
            },
        });

        return this.parseDocumentAiResponse(result);
    }

    private parseDocumentAiResponse(response: any): ExtractionResult {
        const entities = response.document?.entities || [];
        const fields: Record<string, any> = {};
        const lineItems: any[] = [];

        for (const entity of entities) {
            const confidence = entity.confidence || 0;
            const value = entity.mentionText || entity.normalizedValue?.text || null;

            switch (entity.type) {
                case 'supplier_name':
                    fields.sellerName = { value, confidence, needsReview: false, source: 'ai_extracted' };
                    break;
                case 'supplier_address':
                    fields.sellerAddress = { value, confidence, needsReview: false, source: 'ai_extracted' };
                    break;
                case 'supplier_tax_id':
                    fields.sellerVatNumber = { value, confidence, needsReview: false, source: 'ai_extracted' };
                    break;
                case 'receiver_name':
                    fields.buyerName = { value, confidence, needsReview: false, source: 'ai_extracted' };
                    break;
                case 'receiver_address':
                    fields.buyerAddress = { value, confidence, needsReview: false, source: 'ai_extracted' };
                    break;
                case 'receiver_tax_id':
                    fields.buyerVatNumber = { value, confidence, needsReview: false, source: 'ai_extracted' };
                    break;
                case 'invoice_id':
                    fields.invoiceNumber = { value, confidence, needsReview: false, source: 'ai_extracted' };
                    break;
                case 'invoice_date':
                    fields.issueDate = { value: this.formatDate(value), confidence, needsReview: false, source: 'ai_extracted' };
                    break;
                case 'due_date':
                    fields.dueDate = { value: this.formatDate(value), confidence, needsReview: false, source: 'ai_extracted' };
                    break;
                case 'total_amount':
                    fields.totalGrossAmount = { value: this.parseAmount(value), confidence, needsReview: false, source: 'ai_extracted' };
                    break;
                case 'net_amount':
                    fields.totalNetAmount = { value: this.parseAmount(value), confidence, needsReview: false, source: 'ai_extracted' };
                    break;
                case 'total_tax_amount':
                    fields.totalVatAmount = { value: this.parseAmount(value), confidence, needsReview: false, source: 'ai_extracted' };
                    break;
                case 'currency':
                    fields.currencyCode = { value: value?.toUpperCase() || 'EUR', confidence, needsReview: false, source: 'ai_extracted' };
                    break;
                case 'line_item':
                    lineItems.push(this.parseLineItem(entity));
                    break;
            }
        }

        if (!fields.currencyCode) {
            fields.currencyCode = { value: 'EUR', confidence: 0.5, needsReview: true, source: 'ai_extracted' };
        }
        if (!fields.invoiceTypeCode) {
            fields.invoiceTypeCode = { value: '380', confidence: 0.9, needsReview: false, source: 'ai_extracted' };
        }

        const allConfidences = Object.values(fields).map((f: any) => f.confidence);
        const avgConfidence = allConfidences.length > 0
            ? allConfidences.reduce((a: number, b: number) => a + b, 0) / allConfidences.length
            : 0;

        return {
            documentType: 'invoice',
            invoiceCount: 1,
            invoices: [{
                fields,
                lineItems: lineItems.length > 0 ? lineItems : [{
                    lineNumber: { value: '1', confidence: 1.0, needsReview: false, source: 'calculated' as const },
                    description: { value: 'Zie factuur', confidence: 0.5, needsReview: true, source: 'calculated' as const },
                    quantity: { value: 1, confidence: 0.5, needsReview: true, source: 'calculated' as const },
                    unitCode: { value: 'C62', confidence: 0.5, needsReview: true, source: 'calculated' as const },
                    unitPrice: { value: fields.totalNetAmount?.value || 0, confidence: 0.5, needsReview: true, source: 'calculated' as const },
                    lineNetAmount: { value: fields.totalNetAmount?.value || 0, confidence: 0.5, needsReview: true, source: 'calculated' as const },
                    vatRate: { value: 21, confidence: 0.5, needsReview: true, source: 'calculated' as const },
                    vatCategoryCode: { value: 'S', confidence: 0.5, needsReview: true, source: 'calculated' as const },
                }],
                vatBreakdown: [{
                    vatCategoryCode: { value: 'S', confidence: avgConfidence, needsReview: false, source: 'calculated' as const },
                    vatRate: { value: 21, confidence: avgConfidence, needsReview: false, source: 'calculated' as const },
                    taxableAmount: { value: fields.totalNetAmount?.value || 0, confidence: avgConfidence, needsReview: false, source: 'calculated' as const },
                    taxAmount: { value: fields.totalVatAmount?.value || 0, confidence: avgConfidence, needsReview: false, source: 'calculated' as const },
                }],
            }],
            rawConfidence: avgConfidence,
        };
    }

    private parseLineItem(entity: any): any {
        const props = entity.properties || [];
        const getField = (type: string) => {
            const prop = props.find((p: any) => p.type === type);
            return prop ? {
                value: prop.mentionText || prop.normalizedValue?.text || null,
                confidence: prop.confidence || 0,
                needsReview: false,
                source: 'ai_extracted' as const,
            } : { value: null, confidence: 0, needsReview: true, source: 'ai_extracted' as const };
        };

        return {
            lineNumber: { value: '1', confidence: 1.0, needsReview: false, source: 'calculated' as const },
            description: getField('line_item/description'),
            quantity: { ...getField('line_item/quantity'), value: this.parseAmount(getField('line_item/quantity').value) },
            unitCode: { value: 'C62', confidence: 0.5, needsReview: true, source: 'calculated' as const },
            unitPrice: { ...getField('line_item/unit_price'), value: this.parseAmount(getField('line_item/unit_price').value) },
            lineNetAmount: { ...getField('line_item/amount'), value: this.parseAmount(getField('line_item/amount').value) },
            vatRate: { value: 21, confidence: 0.5, needsReview: true, source: 'calculated' as const },
            vatCategoryCode: { value: 'S', confidence: 0.5, needsReview: true, source: 'calculated' as const },
        };
    }

    private formatDate(dateStr: string | null): string | null {
        if (!dateStr) return null;
        try {
            const d = new Date(dateStr);
            return d.toISOString().split('T')[0];
        } catch {
            return dateStr;
        }
    }

    private parseAmount(value: any): number | null {
        if (value === null || value === undefined) return null;
        if (typeof value === 'number') return value;
        const cleaned = String(value).replace(/[€$£\s]/g, '').replace(',', '.');
        const num = parseFloat(cleaned);
        return isNaN(num) ? null : num;
    }
}
