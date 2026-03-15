import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { validateApiKey } from '@/lib/auth/api-key-auth';
import { prisma } from '@/lib/db/prisma';

/**
 * GET /api/v1/credits — Get credit balance for organization.
 */
export async function GET(request: NextRequest) {
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

        const org = prisma.organization.findUnique({ id: organizationId });
        if (!org) {
            return NextResponse.json(
                { error: 'not_found', message: 'Organisatie niet gevonden' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            balance: org.creditBalance,
            totalUsed: org.totalUsed,
            limit: org.creditBalance + org.totalUsed,
        });
    } catch (error) {
        console.error('Error fetching credits:', error);
        return NextResponse.json(
            { error: 'server_error', message: 'Serverfout' },
            { status: 500 }
        );
    }
}
