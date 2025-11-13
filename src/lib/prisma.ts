import { PrismaClient } from '@prisma/client';

declare global {
    // eslint-disable-next-line no-var
    var __prismaWrite: PrismaClient | undefined;
    // eslint-disable-next-line no-var
    var __prismaRead: PrismaClient | undefined;
}

function createPrismaClient(url: string) {
    const logConfig = [];

    // Always log errors
    logConfig.push('error');

    // Add SQL query logging if LOG_PRISMA_SQL is set to true
    if (process.env.LOG_PRISMA_SQL === 'true') {
        logConfig.push('query', 'info', 'warn');
    }

    return new PrismaClient({
        datasources: {
            db: { url }
        },
        log: logConfig as any,
    });
}

// Master database with connection pooling
export const prismaWrite = globalThis.__prismaWrite ?? createPrismaClient(process.env.DATABASE_URL!);

// Read replica with connection pooling
export const prismaRead = process.env.DATABASE_READ_URL
    ? (globalThis.__prismaRead ?? createPrismaClient(process.env.DATABASE_READ_URL))
    : prismaWrite;

if (process.env.NODE_ENV !== 'production') {
    globalThis.__prismaWrite = prismaWrite;
    if (process.env.DATABASE_READ_URL) {
        globalThis.__prismaRead = prismaRead;
    }
}

// Graceful shutdown
process.once('beforeExit', async () => {
    await prismaWrite.$disconnect();
    if (prismaRead !== prismaWrite) {
        await prismaRead.$disconnect();
    }
});
