import { create } from 'xmlbuilder2';
import { ExtractedInvoice, AdminContext } from '@/types/extraction';

/**
 * Builds Peppol PINT EU compliant UBL Invoice XML.
 * 
 * Profile: urn:peppol:pint:billing-1@eu-1
 * 
 * References:
 * - Peppol PINT: https://docs.peppol.eu/poac/pint/
 * - Syntax: https://docs.peppol.eu/poacc/billing/3.0/syntax/ubl-invoice/tree/
 * - Namespaces:
 *   xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
 *   xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
 *   xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
 */
export class UblInvoiceBuilder {

    build(data: ExtractedInvoice, adminContext: AdminContext): string {
        const doc = create({ version: '1.0', encoding: 'UTF-8' })
            .ele('Invoice', {
                'xmlns': 'urn:oasis:names:specification:ubl:schema:xsd:Invoice-2',
                'xmlns:cac': 'urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2',
                'xmlns:cbc': 'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2',
            });

        // === HEADER ===
        // BT-24: ALIGNED-IBRP-004-EU — MUST start with urn:peppol:pint:billing-1@eu-1
        doc.ele('cbc:CustomizationID')
            .txt('urn:peppol:pint:billing-1@eu-1').up();
        // BT-23: Business process type
        doc.ele('cbc:ProfileID')
            .txt('urn:fdc:peppol.eu:2017:poacc:billing:01:1.0').up();
        // BT-1: Invoice number
        doc.ele('cbc:ID').txt(this.getFieldValue(data, 'invoiceNumber', 'DRAFT')).up();
        // BT-2: Issue date
        doc.ele('cbc:IssueDate').txt(this.getFieldValue(data, 'issueDate', new Date().toISOString().split('T')[0])).up();

        // BT-9: Due date (optional)
        const dueDate = this.getFieldValue(data, 'dueDate');
        if (dueDate) {
            doc.ele('cbc:DueDate').txt(dueDate).up();
        }

        // BT-3: Invoice type code
        doc.ele('cbc:InvoiceTypeCode').txt(this.getFieldValue(data, 'invoiceTypeCode', '380')).up();
        // BT-5: Invoice currency code
        doc.ele('cbc:DocumentCurrencyCode').txt(this.getFieldValue(data, 'currencyCode', 'EUR')).up();

        // BT-10: Buyer reference (REQUIRED)
        const buyerRef = this.getFieldValue(data, 'buyerReference');
        doc.ele('cbc:BuyerReference').txt(buyerRef || this.getFieldValue(data, 'invoiceNumber', 'NA')).up();

        // === ACCOUNTING SUPPLIER PARTY (Seller) ===
        this.buildSupplierParty(doc, data, adminContext);

        // === ACCOUNTING CUSTOMER PARTY (Buyer) ===
        this.buildCustomerParty(doc, data, adminContext);

        // === PAYMENT MEANS ===
        this.buildPaymentMeans(doc, data, adminContext);

        // === PAYMENT TERMS ===
        if (dueDate) {
            doc.ele('cac:PaymentTerms')
                .ele('cbc:Note').txt(`Vervaldatum: ${dueDate}`).up()
                .up();
        }

        // === Build lines first to calculate correct totals ===
        const lines = this.prepareLines(data);
        const lineSum = this.roundAmount(lines.reduce((sum, l) => sum + l.lineNetAmount, 0));

        // === Calculate tax from lines (BR-S-08 compliant) ===
        const taxBreakdown = this.calculateTaxBreakdown(lines);
        const calculatedTotalVat = this.roundAmount(
            taxBreakdown.reduce((sum, tb) => sum + tb.taxAmount, 0)
        );

        // === TAX TOTAL ===
        this.buildTaxTotal(doc, data, taxBreakdown, calculatedTotalVat);

        // === LEGAL MONETARY TOTAL ===
        // BR-CO-15: TaxInclusiveAmount = TaxExclusiveAmount + TaxAmount
        const taxExclusive = lineSum;
        const taxInclusive = this.roundAmount(taxExclusive + calculatedTotalVat);
        this.buildMonetaryTotal(doc, data, lineSum, taxExclusive, taxInclusive);

        // === INVOICE LINES ===
        for (const line of lines) {
            this.buildInvoiceLine(doc, line, data);
        }

        return doc.end({ prettyPrint: true });
    }

    private buildSupplierParty(doc: any, data: ExtractedInvoice, adminContext: AdminContext) {
        const supplier = doc.ele('cac:AccountingSupplierParty').ele('cac:Party');

        // EndpointID is REQUIRED
        const sellerVat = this.getFieldValue(data, 'sellerVatNumber');
        const endpointId = sellerVat || '0000000000';
        supplier.ele('cbc:EndpointID', { schemeID: '9944' })
            .txt(endpointId).up();

        // Party Name
        const sellerName = this.getFieldValue(data, 'sellerName', 'Onbekend');
        supplier.ele('cac:PartyName')
            .ele('cbc:Name').txt(sellerName).up().up();

        // Postal Address (REQUIRED)
        const address = supplier.ele('cac:PostalAddress');
        this.addNonEmpty(address, 'cbc:StreetName', this.getFieldValue(data, 'sellerAddress'));
        this.addNonEmpty(address, 'cbc:CityName', this.getFieldValue(data, 'sellerCity'));
        this.addNonEmpty(address, 'cbc:PostalZone', this.getFieldValue(data, 'sellerPostalCode'));
        address.ele('cac:Country')
            .ele('cbc:IdentificationCode').txt(this.getFieldValue(data, 'sellerCountryCode', 'NL')).up().up();
        address.up();

        // PartyTaxScheme (VAT registration)
        if (sellerVat) {
            supplier.ele('cac:PartyTaxScheme')
                .ele('cbc:CompanyID').txt(sellerVat).up()
                .ele('cac:TaxScheme').ele('cbc:ID').txt('VAT').up().up()
                .up();
        }

        // PartyLegalEntity (REQUIRED)
        const legalEntity = supplier.ele('cac:PartyLegalEntity');
        legalEntity.ele('cbc:RegistrationName').txt(sellerName).up();
        // NL-R-003: Dutch suppliers MUST have CompanyID with schemeID 0106 (KVK) or 0190 (OIN)
        const sellerKvk = this.getFieldValue(data, 'sellerKvkNumber', adminContext.kvk || '');
        if (sellerKvk) {
            legalEntity.ele('cbc:CompanyID', { schemeID: '0106' }).txt(sellerKvk).up();
        }
        legalEntity.up();

        supplier.up().up();
    }

    private buildCustomerParty(doc: any, data: ExtractedInvoice, adminContext: AdminContext) {
        const customer = doc.ele('cac:AccountingCustomerParty').ele('cac:Party');

        // EndpointID
        const buyerVat = this.getFieldValue(data, 'buyerVatNumber');
        const endpointId = buyerVat || '0000000000';
        customer.ele('cbc:EndpointID', { schemeID: '9944' })
            .txt(endpointId).up();

        // Party Name
        const buyerName = this.getFieldValue(data, 'buyerName', adminContext.name || 'Onbekend');
        customer.ele('cac:PartyName')
            .ele('cbc:Name').txt(buyerName).up().up();

        // Postal Address
        const address = customer.ele('cac:PostalAddress');
        this.addNonEmpty(address, 'cbc:StreetName', this.getFieldValue(data, 'buyerAddress', adminContext.address || ''));
        this.addNonEmpty(address, 'cbc:CityName', this.getFieldValue(data, 'buyerCity'));
        this.addNonEmpty(address, 'cbc:PostalZone', this.getFieldValue(data, 'buyerPostalCode'));
        address.ele('cac:Country')
            .ele('cbc:IdentificationCode').txt(this.getFieldValue(data, 'buyerCountryCode', 'NL')).up().up();
        address.up();

        // PartyTaxScheme
        if (buyerVat) {
            customer.ele('cac:PartyTaxScheme')
                .ele('cbc:CompanyID').txt(buyerVat).up()
                .ele('cac:TaxScheme').ele('cbc:ID').txt('VAT').up().up()
                .up();
        }

        // PartyLegalEntity (REQUIRED)
        const legalEntity = customer.ele('cac:PartyLegalEntity');
        legalEntity.ele('cbc:RegistrationName').txt(buyerName).up();
        const buyerKvk = this.getFieldValue(data, 'buyerKvkNumber', adminContext.kvk || '');
        if (buyerKvk) {
            // NL buyer: use schemeID 0106 for KVK
            legalEntity.ele('cbc:CompanyID', { schemeID: '0106' }).txt(buyerKvk).up();
        }
        legalEntity.up();

        customer.up().up();
    }

    private buildPaymentMeans(doc: any, data: ExtractedInvoice, adminContext: AdminContext) {
        const paymentMeansCode = this.getFieldValue(data, 'paymentMeansCode', '30');
        const iban = this.getFieldValue(data, 'sellerIban', adminContext.iban || '');
        const bic = this.getFieldValue(data, 'sellerBic');
        const paymentRef = this.getFieldValue(data, 'paymentReference');

        const pm = doc.ele('cac:PaymentMeans');
        pm.ele('cbc:PaymentMeansCode').txt(paymentMeansCode).up();

        if (paymentRef) {
            pm.ele('cbc:PaymentID').txt(paymentRef).up();
        }

        if (iban) {
            const account = pm.ele('cac:PayeeFinancialAccount');
            account.ele('cbc:ID').txt(iban).up();
            if (bic) {
                account.ele('cac:FinancialInstitutionBranch')
                    .ele('cbc:ID').txt(bic).up()
                    .up();
            }
            account.up();
        }

        pm.up();
    }

    /**
     * BR-S-08: TaxableAmount per VAT rate MUST equal sum of line net amounts at that rate.
     * We calculate the tax breakdown from prepared lines to guarantee consistency.
     */
    private calculateTaxBreakdown(lines: PreparedLine[]): TaxBreakdownEntry[] {
        const byRate: Record<string, { taxableAmount: number; vatRate: number; vatCategoryCode: string }> = {};

        for (const line of lines) {
            const key = `${line.vatCategoryCode}_${line.vatRate}`;
            if (!byRate[key]) {
                byRate[key] = {
                    taxableAmount: 0,
                    vatRate: line.vatRate,
                    vatCategoryCode: line.vatCategoryCode,
                };
            }
            byRate[key].taxableAmount += line.lineNetAmount;
        }

        return Object.values(byRate).map(entry => ({
            taxableAmount: this.roundAmount(entry.taxableAmount),
            taxAmount: this.roundAmount(entry.taxableAmount * (entry.vatRate / 100)),
            vatRate: entry.vatRate,
            vatCategoryCode: entry.vatCategoryCode,
        }));
    }

    private buildTaxTotal(
        doc: any,
        data: ExtractedInvoice,
        taxBreakdown: TaxBreakdownEntry[],
        calculatedTotalVat: number,
    ) {
        const currency = this.getFieldValue(data, 'currencyCode', 'EUR');

        const taxTotal = doc.ele('cac:TaxTotal');
        taxTotal.ele('cbc:TaxAmount', { currencyID: currency })
            .txt(this.formatAmount(calculatedTotalVat)).up();

        for (const entry of taxBreakdown) {
            const subtotal = taxTotal.ele('cac:TaxSubtotal');
            subtotal.ele('cbc:TaxableAmount', { currencyID: currency })
                .txt(this.formatAmount(entry.taxableAmount)).up();
            subtotal.ele('cbc:TaxAmount', { currencyID: currency })
                .txt(this.formatAmount(entry.taxAmount)).up();

            const taxCategory = subtotal.ele('cac:TaxCategory');
            taxCategory.ele('cbc:ID').txt(entry.vatCategoryCode).up();
            taxCategory.ele('cbc:Percent').txt(String(entry.vatRate)).up();
            taxCategory.ele('cac:TaxScheme')
                .ele('cbc:ID').txt('VAT').up()
                .up();
            taxCategory.up();
            subtotal.up();
        }

        taxTotal.up();
    }

    private buildMonetaryTotal(
        doc: any,
        data: ExtractedInvoice,
        lineSum: number,
        taxExclusive: number,
        taxInclusive: number,
    ) {
        const currency = this.getFieldValue(data, 'currencyCode', 'EUR');

        const total = doc.ele('cac:LegalMonetaryTotal');
        // BR-CO-10: LineExtensionAmount = sum of line net amounts
        total.ele('cbc:LineExtensionAmount', { currencyID: currency })
            .txt(this.formatAmount(lineSum)).up();
        // BT-109: TaxExclusiveAmount
        total.ele('cbc:TaxExclusiveAmount', { currencyID: currency })
            .txt(this.formatAmount(taxExclusive)).up();
        // BR-CO-15: TaxInclusiveAmount = TaxExclusiveAmount + TaxAmount
        total.ele('cbc:TaxInclusiveAmount', { currencyID: currency })
            .txt(this.formatAmount(taxInclusive)).up();
        // BT-115: PayableAmount
        total.ele('cbc:PayableAmount', { currencyID: currency })
            .txt(this.formatAmount(taxInclusive)).up();
        total.up();
    }

    /**
     * Prepare and normalize all invoice lines.
     */
    private prepareLines(data: ExtractedInvoice): PreparedLine[] {
        if (data.lineItems && data.lineItems.length > 0) {
            return data.lineItems.map((line, index) => {
                const quantity = Number(this.extractValue(line.quantity)) || 1;
                const unitPrice = Number(this.extractValue(line.unitPrice)) || 0;
                const lineNetAmount = Number(this.extractValue(line.lineNetAmount)) || (quantity * unitPrice);
                const vatRate = Number(this.extractValue(line.vatRate));
                const vatCategoryCode = String(this.extractValue(line.vatCategoryCode) || 'S');

                return {
                    id: String(this.extractValue(line.lineNumber) || index + 1),
                    description: String(this.extractValue(line.description) || 'Artikel'),
                    quantity: quantity,
                    unitCode: String(this.extractValue(line.unitCode) || 'C62'),
                    unitPrice: Math.abs(unitPrice),
                    lineNetAmount: lineNetAmount,
                    vatCategoryCode: vatCategoryCode,
                    vatRate: isNaN(vatRate) ? 21 : vatRate,
                };
            });
        }

        // Fallback: single line with total net amount
        const totalNet = this.getNumericFieldValue(data, 'totalNetAmount', 0);
        return [{
            id: '1',
            description: 'Zie factuur',
            quantity: 1,
            unitCode: 'C62',
            unitPrice: Math.abs(totalNet),
            lineNetAmount: totalNet,
            vatCategoryCode: 'S',
            vatRate: 21,
        }];
    }

    private buildInvoiceLine(doc: any, line: PreparedLine, data: ExtractedInvoice) {
        const currency = this.getFieldValue(data, 'currencyCode', 'EUR');

        const invLine = doc.ele('cac:InvoiceLine');
        invLine.ele('cbc:ID').txt(line.id).up();

        // For credit/negative lines, use negative quantity with positive price
        const isCredit = line.lineNetAmount < 0;
        const displayQty = isCredit ? -Math.abs(line.quantity) : Math.abs(line.quantity);

        invLine.ele('cbc:InvoicedQuantity', { unitCode: line.unitCode })
            .txt(String(displayQty)).up();
        invLine.ele('cbc:LineExtensionAmount', { currencyID: currency })
            .txt(this.formatAmount(line.lineNetAmount)).up();

        // Item (REQUIRED)
        const item = invLine.ele('cac:Item');
        item.ele('cbc:Name').txt(line.description).up();

        // ClassifiedTaxCategory (REQUIRED — BR-CO-04)
        const taxCat = item.ele('cac:ClassifiedTaxCategory');
        taxCat.ele('cbc:ID').txt(line.vatCategoryCode).up();
        taxCat.ele('cbc:Percent').txt(String(line.vatRate)).up();
        taxCat.ele('cac:TaxScheme').ele('cbc:ID').txt('VAT').up().up();
        taxCat.up();
        item.up();

        // Price — BR-27: PriceAmount MUST NOT be negative
        const price = invLine.ele('cac:Price');
        price.ele('cbc:PriceAmount', { currencyID: currency })
            .txt(this.formatAmount(Math.abs(line.unitPrice))).up();
        price.up();

        invLine.up();
    }

    // === Helper methods ===

    private addNonEmpty(parent: any, tagName: string, value: string) {
        if (value && value.trim()) {
            parent.ele(tagName).txt(value.trim()).up();
        }
    }

    private getFieldValue(data: ExtractedInvoice, fieldName: string, defaultValue: string = ''): string {
        const field = data.fields[fieldName];
        if (!field || field.value === null || field.value === undefined || String(field.value).trim() === '') {
            return defaultValue;
        }
        return String(field.value).trim();
    }

    private getNumericFieldValue(data: ExtractedInvoice, fieldName: string, defaultValue: number = 0): number {
        const field = data.fields[fieldName];
        if (!field || field.value === null || field.value === undefined) return defaultValue;
        const num = Number(field.value);
        return isNaN(num) ? defaultValue : num;
    }

    private extractValue(field: any): any {
        if (!field) return null;
        if (typeof field === 'object' && 'value' in field) return field.value;
        return field;
    }

    private formatAmount(value: any): string {
        const num = Number(value) || 0;
        return num.toFixed(2);
    }

    private roundAmount(value: number): number {
        return Math.round(value * 100) / 100;
    }
}

interface PreparedLine {
    id: string;
    description: string;
    quantity: number;
    unitCode: string;
    unitPrice: number;
    lineNetAmount: number;
    vatCategoryCode: string;
    vatRate: number;
}

interface TaxBreakdownEntry {
    taxableAmount: number;
    taxAmount: number;
    vatRate: number;
    vatCategoryCode: string;
}
