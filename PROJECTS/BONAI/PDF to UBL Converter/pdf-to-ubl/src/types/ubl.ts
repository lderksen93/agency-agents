// Types voor UBL structuur

export interface UblInvoiceData {
    customizationId: string;
    profileId: string;
    id: string;
    issueDate: string;
    dueDate?: string;
    invoiceTypeCode: string;
    documentCurrencyCode: string;
    buyerReference?: string;
    orderReference?: string;

    supplier: UblParty;
    customer: UblParty;

    paymentMeans?: UblPaymentMeans;
    paymentTerms?: string;

    taxTotal: UblTaxTotal;
    legalMonetaryTotal: UblMonetaryTotal;

    invoiceLines: UblInvoiceLine[];
}

export interface UblParty {
    endpointId?: string;
    endpointSchemeId?: string;
    name: string;
    streetName?: string;
    cityName?: string;
    postalZone?: string;
    countryCode: string;
    vatNumber?: string;
    kvkNumber?: string;
    registrationName?: string;
}

export interface UblPaymentMeans {
    paymentMeansCode: string;
    paymentId?: string;
    iban?: string;
    bic?: string;
}

export interface UblTaxTotal {
    taxAmount: number;
    currencyId: string;
    taxSubtotals: UblTaxSubtotal[];
}

export interface UblTaxSubtotal {
    taxableAmount: number;
    taxAmount: number;
    currencyId: string;
    taxCategoryId: string;
    taxPercent: number;
    taxSchemeId: string;
}

export interface UblMonetaryTotal {
    lineExtensionAmount: number;
    taxExclusiveAmount: number;
    taxInclusiveAmount: number;
    payableAmount: number;
    currencyId: string;
}

export interface UblInvoiceLine {
    id: string;
    invoicedQuantity: number;
    unitCode: string;
    lineExtensionAmount: number;
    currencyId: string;
    itemName: string;
    itemDescription?: string;
    taxCategoryId: string;
    taxPercent: number;
    priceAmount: number;
}

export interface ValidationResult {
    isValid: boolean;
    errors: ValidationError[];
    warnings: ValidationError[];
    fatal: ValidationError[];
}

export interface ValidationError {
    code: string;
    message: string;
    location?: string;
    severity: 'warning' | 'error' | 'fatal';
}
