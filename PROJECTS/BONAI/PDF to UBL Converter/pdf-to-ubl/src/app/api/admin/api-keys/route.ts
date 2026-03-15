import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { prisma } from '@/lib/db/prisma';
import crypto from 'crypto';

/**
 * GET /api/admin/api-keys — List all API keys for organization.
 */
export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
        }
        const organizationId = (session.user as any).organizationId;

        const keys = prisma.apiKey.findMany({ organizationId });
        return NextResponse.json(keys.map((k: any) => ({
            id: k.id,
            name: k.name,
            key: k.key.substring(0, 12) + '...',
            createdAt: k.createdAt,
            lastUsedAt: k.lastUsedAt,
            isActive: !!k.isActive,
        })));
    } catch (error) {
        console.error('Error listing API keys:', error);
        return NextResponse.json({ error: 'server_error' }, { status: 500 });
    }
}

/**
 * POST /api/admin/api-keys — Create new API key.
 */
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || (session.user as any).role !== 'ADMIN') {
            return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
        }
        const organizationId = (session.user as any).organizationId;

        const { name } = await request.json();
        if (!name) {
            return NextResponse.json({ error: 'bad_request', message: 'Naam is verplicht' }, { status: 400 });
        }

        const key = `prc_sk_${crypto.randomBytes(32).toString('hex')}`;

        const apiKeyRecord = prisma.apiKey.create({
            key,
            name,
            organizationId,
        });

        return NextResponse.json({
            id: apiKeyRecord.id,
            name: apiKeyRecord.name,
            key, // Return full key only on creation
            createdAt: apiKeyRecord.createdAt,
        }, { status: 201 });
    } catch (error) {
        console.error('Error creating API key:', error);
        return NextResponse.json({ error: 'server_error' }, { status: 500 });
    }
}

/**
 * DELETE /api/admin/api-keys — Deactivate API key.
 */
export async function DELETE(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || (session.user as any).role !== 'ADMIN') {
            return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const keyId = searchParams.get('id');
        if (!keyId) {
            return NextResponse.json({ error: 'bad_request', message: 'Key ID vereist' }, { status: 400 });
        }

        prisma.apiKey.update({ id: keyId }, { isActive: 0 });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deactivating API key:', error);
        return NextResponse.json({ error: 'server_error' }, { status: 500 });
    }
}
