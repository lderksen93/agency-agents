import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { validateApiKey } from '@/lib/auth/api-key-auth';
import { prisma } from '@/lib/db/prisma';

/**
 * GET /api/v1/convert/[id] — Get conversion status and results.
 */
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        let organizationId: string;

        const apiKeyAuth = await validateApiKey(request);
        if (apiKeyAuth) {
            organizationId = apiKeyAuth.organizationId;
        } else {
            const session = await getServerSession(authOptions);
            if (!session?.user) {
                return NextResponse.json(
                    { error: 'unauthorized', message: 'Authenticatie vereist' },
                    { status: 401 }
                );
            }
            organizationId = (session.user as any).organizationId;
        }

        const conversion = prisma.conversion.findUnique(
            { id: params.id },
            { results: true, organization: true }
        );

        if (!conversion || conversion.organizationId !== organizationId) {
            return NextResponse.json(
                { error: 'not_found', message: 'Conversie niet gevonden' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            id: conversion.id,
            status: conversion.status.toLowerCase(),
            documentType: conversion.documentType.toLowerCase(),
            invoiceCount: conversion.detectedInvoiceCount,
            creditsUsed: conversion.creditsUsed,
            creditsRemaining: conversion.organization?.creditBalance || 0,
            overallConfidence: conversion.overallConfidence,
            flaggedForReview: !!conversion.flaggedForReview,
            flagReason: conversion.flagReason,
            originalFilename: conversion.originalFilename,
            processingTimeMs: conversion.processingTimeMs,
            createdAt: conversion.createdAt,
            completedAt: conversion.completedAt,
            results: (conversion.results || []).map((r: any) => ({
                invoiceIndex: r.invoiceIndex,
                extractedData: JSON.parse(r.extractedData || '{}'),
                fieldScores: JSON.parse(r.fieldScores || '{}'),
                ublXml: r.ublXml,
                isValid: !!r.isValid,
                validationErrors: JSON.parse(r.validationErrors || '[]'),
                flaggedFields: JSON.parse(r.flaggedFields || '[]'),
            })),
            zeroDataRetention: true,
            processedOnEuServers: true,
        });
    } catch (error) {
        console.error('Error fetching conversion:', error);
        return NextResponse.json(
            { error: 'server_error', message: 'Serverfout' },
            { status: 500 }
        );
    }
}
