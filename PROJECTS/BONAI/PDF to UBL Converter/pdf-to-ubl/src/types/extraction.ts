// Types voor geëxtraheerde factuurdata

export interface ExtractedField {
    value: string | number | null;
    confidence: number;
    needsReview: boolean;
    reviewReason?: string;
    source: 'ai_extracted' | 'admin_provided' | 'calculated';
}

export interface ExtractedLineItem {
    lineNumber: ExtractedField;
    description: ExtractedField;
    quantity: ExtractedField;
    unitCode: ExtractedField;
    unitPrice: ExtractedField;
    lineNetAmount: ExtractedField;
    vatRate: ExtractedField;
    vatCategoryCode: ExtractedField;
}

export interface VatBreakdownItem {
    vatCategoryCode: ExtractedField;
    vatRate: ExtractedField;
    taxableAmount: ExtractedField;
    taxAmount: ExtractedField;
}

export interface ExtractedInvoice {
    fields: Record<string, ExtractedField>;
    lineItems: ExtractedLineItem[];
    vatBreakdown: VatBreakdownItem[];
}

export interface ExtractionResult {
    documentType: 'invoice' | 'credit_note' | 'not_invoice' | 'multi_invoice';
    notInvoiceReason?: string;
    invoiceCount: number;
    invoices: ExtractedInvoice[];
    rawConfidence: number;
}

export interface ScoredField {
    value: string | number | null;
    confidence: number;
    needsReview: boolean;
    reviewReason?: string;
}

export interface ScoredConversion {
    overallConfidence: number;
    flaggedFields: string[];
    flaggedForReview: boolean;
}

export interface AdminContext {
    name?: string;
    address?: string;
    kvk?: string;
    iban?: string;
}

export interface OrgAiConfig {
    aiProvider: 'document_ai' | 'openrouter';
    documentAiProjectId?: string;
    documentAiLocation?: string;
    documentAiProcessorId?: string;
    documentAiApiKey?: string;
    openrouterApiKey?: string;
    openrouterModel?: string;
}
