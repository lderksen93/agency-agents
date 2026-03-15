/**
 * Complete mapping of all AI extraction field names to Dutch display labels.
 * These keys match exactly what the AI model returns via OpenRouter.
 */
export const FIELD_LABELS: Record<string, string> = {
    // Factuur Details
    invoiceNumber: 'Factuurnummer',
    issueDate: 'Factuurdatum',
    dueDate: 'Vervaldatum',
    invoiceTypeCode: 'Type Code',
    currencyCode: 'Valuta',
    currency: 'Valuta',
    paymentTerms: 'Betaaltermijn',
    paymentMeansCode: 'Betaalwijze Code',
    paymentReference: 'Betalingsreferentie',
    buyerReference: 'Inkoopordernummer',
    note: 'Opmerking',
    taxPointDate: 'BTW-tijdvak',

    // Verkoper
    sellerName: 'Verkoper Naam',
    sellerAddress: 'Verkoper Adres',
    sellerCity: 'Verkoper Stad',
    sellerPostalCode: 'Verkoper Postcode',
    sellerCountryCode: 'Verkoper Land',
    sellerCountry: 'Verkoper Land',
    sellerVatNumber: 'Verkoper BTW-nummer',
    sellerVatId: 'Verkoper BTW-nummer',
    sellerKvkNumber: 'Verkoper KVK',
    sellerKvk: 'Verkoper KVK',
    sellerIban: 'Verkoper IBAN',
    sellerBic: 'Verkoper BIC',
    sellerEmail: 'Verkoper E-mail',
    sellerPhone: 'Verkoper Telefoon',

    // Koper
    buyerName: 'Koper Naam',
    buyerAddress: 'Koper Adres',
    buyerCity: 'Koper Stad',
    buyerPostalCode: 'Koper Postcode',
    buyerCountryCode: 'Koper Land',
    buyerCountry: 'Koper Land',
    buyerVatNumber: 'Koper BTW-nummer',
    buyerVatId: 'Koper BTW-nummer',
    buyerKvkNumber: 'Koper KVK',
    buyerKvk: 'Koper KVK',
    buyerEmail: 'Koper E-mail',

    // Bedragen
    totalNetAmount: 'Subtotaal (excl. BTW)',
    totalVatAmount: 'Totaal BTW',
    totalGrossAmount: 'Totaalbedrag (incl. BTW)',
    totalPrepaidAmount: 'Reeds betaald',
    totalPayableAmount: 'Te betalen',
    payableAmount: 'Te betalen',
};

/**
 * Group fields into display sections.
 * Includes all known field name variants (both AI naming and alternate naming).
 */
export const FIELD_GROUPS: Record<string, string[]> = {
    'Factuur Details': [
        'invoiceNumber', 'issueDate', 'dueDate', 'invoiceTypeCode',
        'currencyCode', 'currency',
        'paymentTerms', 'paymentMeansCode', 'paymentReference',
        'buyerReference', 'note', 'taxPointDate',
    ],
    'Verkoper': [
        'sellerName', 'sellerAddress', 'sellerCity', 'sellerPostalCode',
        'sellerCountryCode', 'sellerCountry',
        'sellerVatNumber', 'sellerVatId',
        'sellerKvkNumber', 'sellerKvk',
        'sellerIban', 'sellerBic', 'sellerEmail', 'sellerPhone',
    ],
    'Koper': [
        'buyerName', 'buyerAddress', 'buyerCity', 'buyerPostalCode',
        'buyerCountryCode', 'buyerCountry',
        'buyerVatNumber', 'buyerVatId',
        'buyerKvkNumber', 'buyerKvk',
        'buyerEmail',
    ],
    'Bedragen': [
        'totalNetAmount', 'totalVatAmount', 'totalGrossAmount',
        'totalPrepaidAmount', 'totalPayableAmount', 'payableAmount',
    ],
};
