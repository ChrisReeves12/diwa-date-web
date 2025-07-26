import { PrismaClient } from '@prisma/client';

// Master database
export const prismaWrite = new PrismaClient({
    datasources: {
        db: {
            url: process.env.DATABASE_URL
        }
    }
});

// Read replica
export const prismaRead = process.env.DATABASE_READ_URL ? new PrismaClient({
    datasources: {
        db: {
            url: process.env.DATABASE_READ_URL
        }
    }
}) : prismaWrite;
