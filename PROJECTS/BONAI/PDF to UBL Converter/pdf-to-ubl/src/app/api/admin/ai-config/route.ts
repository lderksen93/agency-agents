import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { prisma } from '@/lib/db/prisma';

/**
 * GET /api/admin/ai-config — Get AI provider configuration.
 */
export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || (session.user as any).role !== 'ADMIN') {
            return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
        }
        const organizationId = (session.user as any).organizationId;

        const org = prisma.organization.findUnique({ id: organizationId });
        if (!org) {
            return NextResponse.json({ error: 'not_found' }, { status: 404 });
        }

        return NextResponse.json({
            aiProvider: org.aiProvider,
            documentAiProjectId: org.documentAiProjectId || '',
            documentAiLocation: org.documentAiLocation || 'eu',
            documentAiProcessorId: org.documentAiProcessorId || '',
            openrouterApiKey: org.openrouterApiKey ? '••••••••' : '',
            openrouterModel: org.openrouterModel || 'google/gemini-2.0-flash-001',
        });
    } catch (error) {
        console.error('Error fetching AI config:', error);
        return NextResponse.json({ error: 'server_error' }, { status: 500 });
    }
}

/**
 * PUT /api/admin/ai-config — Update AI provider configuration.
 */
export async function PUT(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || (session.user as any).role !== 'ADMIN') {
            return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
        }
        const organizationId = (session.user as any).organizationId;

        const body = await request.json();
        const updateData: Record<string, any> = {};

        if (body.aiProvider) updateData.aiProvider = body.aiProvider;
        if (body.documentAiProjectId !== undefined) updateData.documentAiProjectId = body.documentAiProjectId || null;
        if (body.documentAiLocation) updateData.documentAiLocation = body.documentAiLocation;
        if (body.documentAiProcessorId !== undefined) updateData.documentAiProcessorId = body.documentAiProcessorId || null;
        if (body.openrouterApiKey && body.openrouterApiKey !== '••••••••') {
            updateData.openrouterApiKey = body.openrouterApiKey;
        }
        if (body.openrouterModel) updateData.openrouterModel = body.openrouterModel;

        if (Object.keys(updateData).length > 0) {
            prisma.organization.update({ id: organizationId }, updateData);
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error updating AI config:', error);
        return NextResponse.json({ error: 'server_error' }, { status: 500 });
    }
}
