import { ValidationResult, ValidationError } from '@/types/ubl';

/**
 * Validates generated UBL XML against:
 * 1. Basic structural checks
 * 2. Peppol BIS 3.0 business rules
 * 
 * Note: Full Schematron validation requires XSLT3/Saxon-JS.
 * This implementation performs essential structural & business rule checks.
 */
export class UblValidator {

    async validate(ublXml: string): Promise<ValidationResult> {
        const errors: ValidationError[] = [];

        // Structural validation
        errors.push(...this.validateStructure(ublXml));

        // Business rule validation
        errors.push(...this.validateBusinessRules(ublXml));

        return {
            isValid: errors.filter(e => e.severity === 'fatal' || e.severity === 'error').length === 0,
            errors: errors.filter(e => e.severity === 'error'),
            warnings: errors.filter(e => e.severity === 'warning'),
            fatal: errors.filter(e => e.severity === 'fatal'),
        };
    }

    private validateStructure(xml: string): ValidationError[] {
        const errors: ValidationError[] = [];

        // Check XML declaration
        if (!xml.startsWith('<?xml')) {
            errors.push({
                code: 'STRUCT-001',
                message: 'Missing XML declaration',
                severity: 'error',
            });
        }

        // Check required namespaces
        if (!xml.includes('urn:oasis:names:specification:ubl:schema:xsd:Invoice-2')) {
            errors.push({
                code: 'STRUCT-002',
                message: 'Missing UBL Invoice namespace',
                severity: 'fatal',
            });
        }

        // Check required elements
        const requiredElements = [
            { tag: 'cbc:CustomizationID', code: 'BT-24', rule: 'BR-01' },
            { tag: 'cbc:ProfileID', code: 'BT-23', rule: 'PEPPOL-EN16931-R001' },
            { tag: 'cbc:ID', code: 'BT-1', rule: 'BR-02' },
            { tag: 'cbc:IssueDate', code: 'BT-2', rule: 'BR-03' },
            { tag: 'cbc:InvoiceTypeCode', code: 'BT-3', rule: 'BR-04' },
            { tag: 'cbc:DocumentCurrencyCode', code: 'BT-5', rule: 'BR-05' },
            { tag: 'cac:AccountingSupplierParty', code: 'BG-4', rule: 'BR-06' },
            { tag: 'cac:AccountingCustomerParty', code: 'BG-7', rule: 'BR-07' },
            { tag: 'cac:TaxTotal', code: 'BG-22', rule: 'BR-CO-15' },
            { tag: 'cac:LegalMonetaryTotal', code: 'BG-22', rule: 'BR-12' },
            { tag: 'cac:InvoiceLine', code: 'BG-25', rule: 'BR-16' },
        ];

        for (const elem of requiredElements) {
            if (!xml.includes(`<${elem.tag}`)) {
                errors.push({
                    code: elem.rule,
                    message: `Missing required element: ${elem.tag} (${elem.code})`,
                    location: elem.tag,
                    severity: 'fatal',
                });
            }
        }

        // Check BuyerReference or OrderReference
        if (!xml.includes('cbc:BuyerReference') && !xml.includes('cac:OrderReference')) {
            errors.push({
                code: 'PEPPOL-EN16931-R003',
                message: 'BuyerReference or OrderReference is required',
                severity: 'error',
            });
        }

        return errors;
    }

    private validateBusinessRules(xml: string): ValidationError[] {
        const errors: ValidationError[] = [];

        // PEPPOL-EN16931-R020: EndpointID is required for both supplier and customer
        const supplierSection = this.extractSection(xml, 'cac:AccountingSupplierParty');
        if (supplierSection && !supplierSection.includes('cbc:EndpointID')) {
            errors.push({
                code: 'PEPPOL-EN16931-R020',
                message: 'Seller EndpointID is required',
                location: 'cac:AccountingSupplierParty',
                severity: 'error',
            });
        }

        // Check valid InvoiceTypeCode
        const typeCodeMatch = xml.match(/<cbc:InvoiceTypeCode>(\d+)<\/cbc:InvoiceTypeCode>/);
        if (typeCodeMatch) {
            const validCodes = ['380', '381', '384', '389', '751'];
            if (!validCodes.includes(typeCodeMatch[1])) {
                errors.push({
                    code: 'BR-CL-01',
                    message: `Invalid InvoiceTypeCode: ${typeCodeMatch[1]}. Valid codes: ${validCodes.join(', ')}`,
                    severity: 'error',
                });
            }
        }

        // Check valid currency code
        const currencyMatch = xml.match(/<cbc:DocumentCurrencyCode>([A-Z]{3})<\/cbc:DocumentCurrencyCode>/);
        if (!currencyMatch) {
            errors.push({
                code: 'BR-CL-04',
                message: 'DocumentCurrencyCode must be a valid ISO 4217 code',
                severity: 'warning',
            });
        }

        // Check TaxScheme ID is "VAT"
        if (xml.includes('<cac:TaxScheme>') && !xml.includes('<cbc:ID>VAT</cbc:ID>')) {
            errors.push({
                code: 'PEPPOL-EN16931-R061',
                message: 'TaxScheme ID must be "VAT"',
                severity: 'warning',
            });
        }

        return errors;
    }

    private extractSection(xml: string, tag: string): string | null {
        const openTag = `<${tag}`;
        const closeTag = `</${tag}>`;
        const startIdx = xml.indexOf(openTag);
        const endIdx = xml.indexOf(closeTag);

        if (startIdx === -1 || endIdx === -1) return null;
        return xml.substring(startIdx, endIdx + closeTag.length);
    }
}
