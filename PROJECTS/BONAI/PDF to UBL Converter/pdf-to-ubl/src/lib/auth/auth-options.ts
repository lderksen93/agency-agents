import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db/prisma';

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: 'credentials',
            credentials: {
                email: { label: 'E-mail', type: 'email' },
                password: { label: 'Wachtwoord', type: 'password' },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) return null;

                const user = prisma.user.findUnique({ email: credentials.email });
                if (!user || !user.passwordHash) return null;

                const valid = await bcrypt.compare(credentials.password, user.passwordHash);
                if (!valid) return null;

                return {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role,
                    organizationId: user.organizationId,
                };
            },
        }),
    ],
    session: { strategy: 'jwt' },
    pages: {
        signIn: '/login',
    },
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.role = (user as any).role;
                token.organizationId = (user as any).organizationId;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                (session.user as any).id = token.sub;
                (session.user as any).role = token.role;
                (session.user as any).organizationId = token.organizationId;
            }
            return session;
        },
    },
};
