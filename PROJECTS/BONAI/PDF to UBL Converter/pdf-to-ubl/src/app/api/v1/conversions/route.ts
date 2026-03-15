import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { prisma } from '@/lib/db/prisma';

/**
 * GET /api/v1/conversions — List recent conversions for the org.
 */
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json(
                { error: 'unauthorized', message: 'Authenticatie vereist' },
                { status: 401 }
            );
        }

        const organizationId = (session.user as any).organizationId;

        const conversions = prisma.conversion.findMany(
            { organizationId },
            { orderBy: 'createdAt', take: 50 }
        );

        return NextResponse.json({
            conversions: conversions.map((c: any) => ({
                id: c.id,
                status: (c.status || 'PENDING').toLowerCase(),
                documentType: c.documentType || null,
                originalFilename: c.originalFilename,
                overallConfidence: c.overallConfidence || null,
                creditsUsed: c.creditsUsed || 0,
                detectedInvoiceCount: c.detectedInvoiceCount || 0,
                flaggedForReview: !!c.flaggedForReview,
                processingTimeMs: c.processingTimeMs || null,
                aiProvider: c.aiProvider || null,
                createdAt: c.createdAt,
                completedAt: c.completedAt || null,
            })),
        });
    } catch (error) {
        console.error('Error listing conversions:', error);
        return NextResponse.json(
            { error: 'server_error', message: 'Serverfout' },
            { status: 500 }
        );
    }
}
