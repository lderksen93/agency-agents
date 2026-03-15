/**
 * Code lists for UBL and Peppol BIS 3.0 compliance.
 * ISO codes, UN/CEFACT codes, etc.
 */

// ISO 4217 Currency codes (most used in NL/EU)
export const CURRENCY_CODES: Record<string, string> = {
    EUR: 'Euro',
    USD: 'US Dollar',
    GBP: 'British Pound',
    CHF: 'Swiss Franc',
    SEK: 'Swedish Krona',
    DKK: 'Danish Krone',
    NOK: 'Norwegian Krone',
    PLN: 'Polish Zloty',
    CZK: 'Czech Koruna',
};

// UN/ECE Rec 20 Unit codes
export const UNIT_CODES: Record<string, string> = {
    C62: 'Stuk (Unit)',
    HUR: 'Uur (Hour)',
    DAY: 'Dag (Day)',
    MON: 'Maand (Month)',
    ANN: 'Jaar (Year)',
    KGM: 'Kilogram',
    MTR: 'Meter',
    LTR: 'Liter',
    MTK: 'Vierkante meter',
    EA: 'Each',
    SET: 'Set',
    PR: 'Paar (Pair)',
    XPK: 'Pakket (Package)',
    XBX: 'Doos (Box)',
    ZZ: 'Mutually defined',
};

// Invoice Type codes (UNTDID 1001 subset)
export const INVOICE_TYPE_CODES: Record<string, string> = {
    '380': 'Factuur (Commercial invoice)',
    '381': 'Creditnota (Credit note)',
    '384': 'Gecorrigeerde factuur (Corrected invoice)',
    '389': 'Zelfbemeten factuur (Self-billed invoice)',
    '751': 'Factuur voor boekingsdoeleinden',
};

// VAT Category codes (UNCL5305 subset)
export const VAT_CATEGORY_CODES: Record<string, string> = {
    S: 'Standaardtarief (Standard rate)',
    Z: 'Nultarief (Zero rated)',
    E: 'Vrijgesteld (Exempt)',
    AE: 'BTW verlegd (Reverse charge)',
    K: 'Intracommunautair (Intra-community supply)',
    G: 'Export (buiten EU)',
    O: 'Niet onderworpen aan BTW',
    L: 'Canarische Eilanden',
    M: 'Ceuta en Melilla',
};

// Common Dutch VAT rates
export const NL_VAT_RATES = {
    STANDARD: 21,
    REDUCED: 9,
    ZERO: 0,
};

// Payment Means codes (UNTDID 4461 subset)
export const PAYMENT_MEANS_CODES: Record<string, string> = {
    '10': 'Contant (Cash)',
    '20': 'Cheque',
    '30': 'Overboeking (Credit transfer)',
    '42': 'Automatische incasso (Payment to bank account)',
    '48': 'Creditcard (Bank card)',
    '49': 'Direct debit (Automatische incasso)',
    '57': 'Standing agreement',
    '58': 'SEPA credit transfer',
};

// ISO 3166-1 alpha-2 Country codes (EU + common)
export const COUNTRY_CODES: Record<string, string> = {
    NL: 'Nederland',
    BE: 'België',
    DE: 'Duitsland',
    FR: 'Frankrijk',
    GB: 'Verenigd Koninkrijk',
    LU: 'Luxemburg',
    AT: 'Oostenrijk',
    IT: 'Italië',
    ES: 'Spanje',
    PT: 'Portugal',
    IE: 'Ierland',
    DK: 'Denemarken',
    SE: 'Zweden',
    FI: 'Finland',
    NO: 'Noorwegen',
    CH: 'Zwitserland',
    PL: 'Polen',
    CZ: 'Tsjechië',
    US: 'Verenigde Staten',
};

// Endpoint Scheme IDs (EAS codes)
export const ENDPOINT_SCHEME_IDS: Record<string, string> = {
    '0002': 'SIRENE (FR)',
    '0007': 'Organisationsnummer (SE)',
    '0009': 'SIRET (FR)',
    '0037': 'FTI (FI)',
    '0060': 'DUNS',
    '0088': 'EAN / GLN',
    '0096': 'DANISH',
    '0106': 'ICD',
    '0130': 'EU-VAT',
    '0135': 'IT SIA',
    '0142': 'IT-SIA',
    '0151': 'AU-ABN',
    '0183': 'IBAN',
    '0184': 'DK-CPR',
    '0190': 'NL OIN',
    '0191': 'NL KVK',
    '0192': 'DK-SE',
    '9944': 'NL BTW-nummer',
    '9954': 'NL OIN (deprecated)',
};
