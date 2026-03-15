import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { prisma } from '@/lib/db/prisma';
import bcrypt from 'bcryptjs';

/**
 * GET /api/admin/users — List users in organization.
 */
export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || (session.user as any).role !== 'ADMIN') {
            return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
        }
        const organizationId = (session.user as any).organizationId;

        const users = prisma.user.findMany({ organizationId });
        return NextResponse.json(users.map((u: any) => ({
            id: u.id,
            email: u.email,
            name: u.name,
            role: u.role,
            createdAt: u.createdAt,
            conversionsCount: prisma.conversion.count({ organizationId }),
        })));
    } catch (error) {
        console.error('Error listing users:', error);
        return NextResponse.json({ error: 'server_error' }, { status: 500 });
    }
}

/**
 * POST /api/admin/users — Create new user.
 */
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || (session.user as any).role !== 'ADMIN') {
            return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
        }
        const organizationId = (session.user as any).organizationId;

        const { email, name, password, role } = await request.json();
        if (!email || !password) {
            return NextResponse.json(
                { error: 'bad_request', message: 'E-mail en wachtwoord zijn verplicht' },
                { status: 400 }
            );
        }

        const existing = prisma.user.findUnique({ email });
        if (existing) {
            return NextResponse.json(
                { error: 'conflict', message: 'E-mailadres is al in gebruik' },
                { status: 409 }
            );
        }

        const passwordHash = await bcrypt.hash(password, 12);
        const newUser = prisma.user.create({
            email,
            name: name || null,
            passwordHash,
            role: role || 'USER',
            organizationId,
        });

        return NextResponse.json({
            id: newUser.id,
            email: newUser.email,
            name: newUser.name,
            role: newUser.role,
        }, { status: 201 });
    } catch (error) {
        console.error('Error creating user:', error);
        return NextResponse.json({ error: 'server_error' }, { status: 500 });
    }
}

/**
 * PUT /api/admin/users — Update user role.
 */
export async function PUT(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || (session.user as any).role !== 'ADMIN') {
            return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
        }

        const { userId, role } = await request.json();
        if (!userId || !role) {
            return NextResponse.json(
                { error: 'bad_request', message: 'userId en role zijn verplicht' },
                { status: 400 }
            );
        }

        prisma.user.update({ id: userId }, { role });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error updating user:', error);
        return NextResponse.json({ error: 'server_error' }, { status: 500 });
    }
}
