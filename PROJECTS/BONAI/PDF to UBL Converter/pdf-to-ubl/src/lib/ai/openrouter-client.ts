import { AiProvider } from './provider-factory';
import { ExtractionResult, OrgAiConfig } from '@/types/extraction';
import { EXTRACTION_SYSTEM_PROMPT, EXTRACTION_USER_PROMPT } from './extraction-prompt';

/**
 * OpenRouter API integration for vision-based invoice extraction.
 * Uses OpenRouter's file-parser plugin for PDF handling.
 * Works with ALL models — OpenRouter converts PDFs per provider.
 */
export class OpenRouterProvider implements AiProvider {
    private apiKey: string;
    private model: string;
    private baseUrl = 'https://openrouter.ai/api/v1';

    constructor(config: OrgAiConfig) {
        this.apiKey = config.openrouterApiKey || '';
        this.model = config.openrouterModel || 'google/gemini-2.0-flash-001';
    }

    async extract(pdfBuffer: Buffer): Promise<ExtractionResult> {
        if (!this.apiKey) {
            throw new Error('OpenRouter API key niet geconfigureerd. Ga naar Admin → AI Configuratie om uw API key in te stellen.');
        }

        const base64Pdf = pdfBuffer.toString('base64');
        const dataUrl = `data:application/pdf;base64,${base64Pdf}`;

        // Use OpenRouter's file content type + file-parser plugin
        // See: https://openrouter.ai/docs/guides/overview/multimodal/pdfs
        const response = await fetch(`${this.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://procai.nl',
                'X-Title': 'Procai PDF-to-UBL Converter',
            },
            body: JSON.stringify({
                model: this.model,
                messages: [
                    { role: 'system', content: EXTRACTION_SYSTEM_PROMPT },
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'file',
                                file: {
                                    filename: 'invoice.pdf',
                                    file_data: dataUrl,
                                },
                            },
                            { type: 'text', text: EXTRACTION_USER_PROMPT },
                        ],
                    },
                ],
                plugins: [
                    {
                        id: 'file-parser',
                        pdf: {
                            engine: 'mistral-ocr',
                        },
                    },
                ],
                response_format: { type: 'json_object' },
                temperature: 0,
            }),
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`OpenRouter API fout: ${response.status} — ${error}`);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;

        if (!content) {
            throw new Error('Geen response content van OpenRouter');
        }

        try {
            // Strip markdown code fences if present (some models wrap JSON in ```json blocks)
            let jsonContent = content.trim();
            if (jsonContent.startsWith('```')) {
                jsonContent = jsonContent.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
            }
            const parsed = JSON.parse(jsonContent);
            return this.normalizeResponse(parsed);
        } catch (e) {
            throw new Error(`Ongeldige JSON response van AI model: ${content.substring(0, 500)}`);
        }
    }

    /**
     * Normalize the AI response to our ExtractionResult format.
     */
    private normalizeResponse(parsed: any): ExtractionResult {
        const result: ExtractionResult = {
            documentType: parsed.documentType || 'invoice',
            notInvoiceReason: parsed.notInvoiceReason,
            invoiceCount: parsed.invoiceCount || 1,
            invoices: [],
            rawConfidence: 0,
        };

        if (parsed.invoices && Array.isArray(parsed.invoices)) {
            for (const inv of parsed.invoices) {
                const fields: Record<string, any> = {};

                if (inv.fields) {
                    for (const [key, val] of Object.entries(inv.fields)) {
                        if (val && typeof val === 'object' && 'value' in (val as any)) {
                            fields[key] = {
                                value: (val as any).value,
                                confidence: (val as any).confidence || 0,
                                needsReview: (val as any).confidence < 0.85,
                                source: 'ai_extracted',
                            };
                        } else {
                            fields[key] = {
                                value: val,
                                confidence: 0.5,
                                needsReview: true,
                                source: 'ai_extracted',
                            };
                        }
                    }
                }

                const lineItems = (inv.lineItems || []).map((li: any, idx: number) => {
                    const normalizeField = (field: any, defaultValue: any = null) => {
                        if (field && typeof field === 'object' && 'value' in field) {
                            return {
                                value: field.value,
                                confidence: field.confidence || 0,
                                needsReview: (field.confidence || 0) < 0.85,
                                source: 'ai_extracted' as const,
                            };
                        }
                        return {
                            value: field ?? defaultValue,
                            confidence: 0.5,
                            needsReview: true,
                            source: 'ai_extracted' as const,
                        };
                    };

                    return {
                        lineNumber: normalizeField(li.lineNumber, String(idx + 1)),
                        description: normalizeField(li.description, ''),
                        quantity: normalizeField(li.quantity, 1),
                        unitCode: normalizeField(li.unitCode, 'C62'),
                        unitPrice: normalizeField(li.unitPrice, 0),
                        lineNetAmount: normalizeField(li.lineNetAmount, 0),
                        vatRate: normalizeField(li.vatRate, 21),
                        vatCategoryCode: normalizeField(li.vatCategoryCode, 'S'),
                    };
                });

                const vatBreakdown = (inv.vatBreakdown || []).map((vb: any) => {
                    const normalizeField = (field: any, defaultValue: any = null) => {
                        if (field && typeof field === 'object' && 'value' in field) {
                            return {
                                value: field.value,
                                confidence: field.confidence || 0,
                                needsReview: (field.confidence || 0) < 0.85,
                                source: 'ai_extracted' as const,
                            };
                        }
                        return {
                            value: field ?? defaultValue,
                            confidence: 0.5,
                            needsReview: true,
                            source: 'ai_extracted' as const,
                        };
                    };

                    return {
                        vatCategoryCode: normalizeField(vb.vatCategoryCode, 'S'),
                        vatRate: normalizeField(vb.vatRate, 21),
                        taxableAmount: normalizeField(vb.taxableAmount, 0),
                        taxAmount: normalizeField(vb.taxAmount, 0),
                    };
                });

                result.invoices.push({ fields, lineItems, vatBreakdown });
            }
        }

        if (result.invoices.length > 0 && result.invoices[0].fields) {
            const allConfidences = Object.values(result.invoices[0].fields)
                .map((f: any) => f.confidence)
                .filter((c: number) => c > 0);
            result.rawConfidence = allConfidences.length > 0
                ? allConfidences.reduce((a: number, b: number) => a + b, 0) / allConfidences.length
                : 0;
        }

        return result;
    }
}
