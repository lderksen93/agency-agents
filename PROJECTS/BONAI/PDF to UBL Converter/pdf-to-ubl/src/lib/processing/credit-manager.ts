import { prisma } from '@/lib/db/prisma';

/**
 * Credit Manager — handles credit balance checks and deductions.
 * Uses direct better-sqlite3 database access.
 */
export class CreditManager {
    async checkBalance(organizationId: string): Promise<{ balance: number; totalUsed: number }> {
        const org = prisma.organization.findUnique({ id: organizationId });
        if (!org) throw new Error('Organisatie niet gevonden');
        return { balance: org.creditBalance, totalUsed: org.totalUsed };
    }

    async checkAndDeduct(organizationId: string, credits: number = 1): Promise<{
        allowed: boolean;
        message: string;
        remaining: number;
    }> {
        const org = prisma.organization.findUnique({ id: organizationId });
        if (!org) {
            return { allowed: false, message: 'Organisatie niet gevonden', remaining: 0 };
        }

        if (org.creditBalance < credits) {
            return {
                allowed: false,
                message: `Onvoldoende credits. Beschikbaar: ${org.creditBalance}, nodig: ${credits}`,
                remaining: org.creditBalance,
            };
        }

        prisma.organization.update(
            { id: organizationId },
            {
                creditBalance: org.creditBalance - credits,
                totalUsed: org.totalUsed + credits,
            }
        );

        return {
            allowed: true,
            message: 'OK',
            remaining: org.creditBalance - credits,
        };
    }

    async refund(organizationId: string, credits: number = 1): Promise<void> {
        const org = prisma.organization.findUnique({ id: organizationId });
        if (!org) return;

        prisma.organization.update(
            { id: organizationId },
            {
                creditBalance: org.creditBalance + credits,
                totalUsed: Math.max(0, org.totalUsed - credits),
            }
        );
    }
}
