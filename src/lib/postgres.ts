import { Pool } from 'pg';
import process from "process";

declare global {
    // eslint-disable-next-line no-var
    var __pgDbWritePool: Pool | undefined;
    // eslint-disable-next-line no-var
    var __pgDbReadPool: Pool | undefined;
}

function createPool(connectionString: string) {
    return new Pool({
        connectionString,
        max: Number(process.env.POSTGRES_POOL_SIZE) || 20,
        keepAlive: true,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000
    });
}

export const pgDbWritePool = globalThis.__pgDbWritePool ?? createPool(process.env.DATABASE_URL!);

export const pgDbReadPool = process.env.DATABASE_READ_URL 
    ? (globalThis.__pgDbReadPool ?? createPool(process.env.DATABASE_READ_URL))
    : pgDbWritePool;

if (process.env.NODE_ENV !== 'production') {
    globalThis.__pgDbWritePool = pgDbWritePool;
    if (process.env.DATABASE_READ_URL) {
        globalThis.__pgDbReadPool = pgDbReadPool;
    }
}

// Graceful shutdown
process.once('beforeExit', async () => {
    await pgDbWritePool.end();
    if (pgDbReadPool !== pgDbWritePool) {
        await pgDbReadPool.end();
    }
});

// Default export for backward compatibility (deprecated - use pgDbWritePool or pgDbReadPool)
export default pgDbWritePool;
