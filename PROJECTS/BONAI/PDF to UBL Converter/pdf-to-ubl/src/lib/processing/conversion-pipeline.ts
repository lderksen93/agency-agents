import { prisma } from '@/lib/db/prisma';
import { createAiProvider } from '@/lib/ai/provider-factory';
import { UblInvoiceBuilder } from '@/lib/ubl/ubl-builder';
import { UblValidator } from '@/lib/ubl/ubl-validator';
import { ConfidenceScorer } from '@/lib/processing/confidence-scorer';
import { CreditManager } from '@/lib/processing/credit-manager';
import { PdfSplitter } from '@/lib/pdf/pdf-splitter';
import { ExtractionResult, AdminContext, OrgAiConfig } from '@/types/extraction';

export interface PipelineInput {
    pdfBuffer: Buffer;
    filename: string;
    organizationId: string;
    userId?: string;
    adminContext: AdminContext;
}

export interface PipelineOutput {
    conversionId: string;
    status: 'completed' | 'failed' | 'flagged';
    documentType: string;
    invoiceCount: number;
    creditsUsed: number;
    creditsRemaining: number;
    results: {
        invoiceIndex: number;
        overallConfidence: number;
        flaggedForReview: boolean;
        flaggedFields: string[];
        extractedData: Record<string, any>;
        ublXml: string;
        validationResult: {
            isValid: boolean;
            errors: { code: string; message: string }[];
            warnings: { code: string; message: string }[];
        };
    }[];
}

/**
 * Main conversion pipeline orchestrator.
 * Uses direct better-sqlite3 database access.
 */
export class ConversionPipeline {
    private creditManager = new CreditManager();
    private pdfSplitter = new PdfSplitter();
    private ublBuilder = new UblInvoiceBuilder();
    private ublValidator = new UblValidator();
    private confidenceScorer = new ConfidenceScorer();

    async process(input: PipelineInput): Promise<PipelineOutput> {
        const startTime = Date.now();

        // Get org config (synchronous)
        const org = prisma.organization.findUnique({ id: input.organizationId });
        if (!org) {
            throw new Error('Organisatie niet gevonden');
        }

        // Get PDF info
        const pdfInfo = await this.pdfSplitter.getInfo(input.pdfBuffer);

        // Create conversion record (synchronous)
        const conversion = prisma.conversion.create({
            organizationId: input.organizationId,
            userId: input.userId,
            status: 'PROCESSING',
            originalFilename: input.filename,
            pageCount: pdfInfo.pageCount,
            fileSize: pdfInfo.fileSize,
            adminName: input.adminContext.name,
            adminAddress: input.adminContext.address,
            adminKvk: input.adminContext.kvk,
            adminIban: input.adminContext.iban,
        });

        try {
            // Credit check
            const creditCheck = await this.creditManager.checkAndDeduct(input.organizationId, 1);
            if (!creditCheck.allowed) {
                this.updateConversionStatus(conversion.id, 'FAILED', creditCheck.message);
                throw new Error(creditCheck.message);
            }

            // AI extraction
            const aiConfig: OrgAiConfig = {
                aiProvider: org.aiProvider as 'document_ai' | 'openrouter',
                documentAiProjectId: org.documentAiProjectId || undefined,
                documentAiLocation: org.documentAiLocation || undefined,
                documentAiProcessorId: org.documentAiProcessorId || undefined,
                documentAiApiKey: org.documentAiApiKey || undefined,
                openrouterApiKey: org.openrouterApiKey || undefined,
                openrouterModel: org.openrouterModel || undefined,
            };

            const aiProvider = await createAiProvider(aiConfig);
            const extraction = await aiProvider.extract(input.pdfBuffer);

            // Handle non-invoice documents
            if (extraction.documentType === 'not_invoice') {
                prisma.conversion.update(
                    { id: conversion.id },
                    {
                        status: 'FLAGGED',
                        documentType: 'NOT_INVOICE',
                        flaggedForReview: 1,
                        flagReason: `not_invoice:${extraction.notInvoiceReason || 'onbekend'}`,
                        aiProvider: org.aiProvider,
                        processingTimeMs: Date.now() - startTime,
                        completedAt: new Date().toISOString(),
                    }
                );

                // Refund the credit
                await this.creditManager.refund(input.organizationId, 1);

                return {
                    conversionId: conversion.id,
                    status: 'flagged',
                    documentType: 'not_invoice',
                    invoiceCount: 0,
                    creditsUsed: 0,
                    creditsRemaining: creditCheck.remaining + 1,
                    results: [],
                };
            }

            // Handle multi-invoice (deduct additional credits)
            if (extraction.invoiceCount > 1) {
                const extraCredits = extraction.invoiceCount - 1;
                const extraCheck = await this.creditManager.checkAndDeduct(input.organizationId, extraCredits);
                if (!extraCheck.allowed) {
                    extraction.invoices = extraction.invoices.slice(0, 1);
                    extraction.invoiceCount = 1;
                }
            }

            // Process each invoice
            const results = [];
            for (let i = 0; i < extraction.invoices.length; i++) {
                const invoice = extraction.invoices[i];

                // Score confidence
                const singleExtraction: ExtractionResult = {
                    ...extraction,
                    invoices: [invoice],
                    invoiceCount: 1,
                };
                const scoring = this.confidenceScorer.scoreExtraction(singleExtraction);

                // Build UBL XML
                const ublXml = this.ublBuilder.build(invoice, input.adminContext);

                // Validate UBL
                const validation = await this.ublValidator.validate(ublXml);

                // Build full extracted data including line items and VAT
                const fullExtractedData = {
                    ...invoice.fields,
                    lineItems: invoice.lineItems || [],
                    vatBreakdown: invoice.vatBreakdown || [],
                };

                // Store result (synchronous)
                prisma.conversionResult.create({
                    conversionId: conversion.id,
                    invoiceIndex: i,
                    extractedData: JSON.stringify(fullExtractedData),
                    fieldScores: JSON.stringify(Object.fromEntries(
                        Object.entries(invoice.fields).map(([k, v]) => [k, v.confidence])
                    )),
                    ublXml,
                    isValid: validation.isValid,
                    validationErrors: JSON.stringify(validation.errors),
                    flaggedFields: JSON.stringify(scoring.flaggedFields),
                });

                results.push({
                    invoiceIndex: i,
                    overallConfidence: scoring.overallConfidence,
                    flaggedForReview: scoring.flaggedForReview,
                    flaggedFields: scoring.flaggedFields,
                    extractedData: fullExtractedData,
                    ublXml,
                    validationResult: {
                        isValid: validation.isValid,
                        errors: validation.errors.map(e => ({ code: e.code, message: e.message })),
                        warnings: validation.warnings.map(e => ({ code: e.code, message: e.message })),
                    },
                });
            }

            // Update conversion (synchronous)
            const processingTime = Date.now() - startTime;
            prisma.conversion.update(
                { id: conversion.id },
                {
                    status: 'COMPLETED',
                    documentType: extraction.documentType === 'credit_note' ? 'CREDIT_NOTE'
                        : extraction.invoiceCount > 1 ? 'MULTI_INVOICE' : 'INVOICE',
                    overallConfidence: results[0]?.overallConfidence || 0,
                    flaggedForReview: results.some(r => r.flaggedForReview) ? 1 : 0,
                    detectedInvoiceCount: extraction.invoiceCount,
                    aiProvider: org.aiProvider,
                    processingTimeMs: processingTime,
                    creditsUsed: extraction.invoiceCount,
                    completedAt: new Date().toISOString(),
                }
            );

            // ZERO DATA RETENTION
            input.pdfBuffer = Buffer.alloc(0);

            const balance = await this.creditManager.checkBalance(input.organizationId);

            return {
                conversionId: conversion.id,
                status: 'completed',
                documentType: extraction.documentType,
                invoiceCount: extraction.invoiceCount,
                creditsUsed: extraction.invoiceCount,
                creditsRemaining: balance.balance,
                results,
            };

        } catch (error) {
            this.updateConversionStatus(conversion.id, 'FAILED', String(error));
            throw error;
        }
    }

    private updateConversionStatus(id: string, status: 'FAILED' | 'FLAGGED', reason?: string) {
        prisma.conversion.update(
            { id },
            {
                status,
                flagReason: reason,
                completedAt: new Date().toISOString(),
            }
        );
    }
}
