const { PrismaClient } = require('@prisma/client');

async function main() {
    try {
        const prisma = new PrismaClient({
            log: ['query', 'info', 'warn', 'error'],
        });
        console.log('Connecting...');
        await prisma.$connect();
        console.log('Connected!');

        const count = await prisma.organization.count();
        console.log('Organizations:', count);

        const org = await prisma.organization.create({
            data: {
                name: 'Test BV',
                users: {
                    create: {
                        email: 'admin@test.nl',
                        name: 'Admin',
                        passwordHash: '$2a$12$test',
                        role: 'ADMIN',
                    },
                },
            },
            include: { users: true },
        });
        console.log('Created org:', org);

        await prisma.$disconnect();
    } catch (e) {
        console.error('FULL ERROR:', e);
        process.exit(1);
    }
}

main();
