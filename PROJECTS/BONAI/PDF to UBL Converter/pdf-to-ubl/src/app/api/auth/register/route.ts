import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import bcrypt from 'bcryptjs';

/**
 * POST /api/auth/register — Create new organization + admin user.
 */
export async function POST(request: NextRequest) {
    try {
        const { organizationName, name, email, password } = await request.json();

        if (!organizationName || !email || !password) {
            return NextResponse.json(
                { error: 'bad_request', message: 'Alle velden zijn verplicht' },
                { status: 400 }
            );
        }

        if (password.length < 8) {
            return NextResponse.json(
                { error: 'bad_request', message: 'Wachtwoord moet minimaal 8 tekens bevatten' },
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

        // Create organization
        const org = prisma.organization.create({
            name: organizationName,
            creditBalance: parseInt(process.env.DEFAULT_CREDITS || '1000'),
        });

        // Create admin user linked to org
        const newUser = prisma.user.create({
            email,
            name,
            passwordHash,
            role: 'ADMIN',
            organizationId: org.id,
        });

        return NextResponse.json({
            id: newUser.id,
            email: newUser.email,
            organizationId: org.id,
        }, { status: 201 });

    } catch (error) {
        console.error('Registration error:', error);
        return NextResponse.json(
            { error: 'server_error', message: 'Er is een fout opgetreden bij de registratie' },
            { status: 500 }
        );
    }
}
