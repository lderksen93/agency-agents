import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db/prisma';

/**
 * Validate API key from Authorization header (Bearer prc_sk_xxx).
 */
export async function validateApiKey(request: NextRequest): Promise<{ organizationId: string } | null> {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer prc_sk_')) return null;

    const key = authHeader.replace('Bearer ', '');

    const apiKeyRecord = prisma.apiKey.findUnique({ key });
    if (!apiKeyRecord || !apiKeyRecord.isActive) return null;

    // Update last used timestamp
    prisma.apiKey.updateLastUsed(key);

    return { organizationId: apiKeyRecord.organizationId };
}
