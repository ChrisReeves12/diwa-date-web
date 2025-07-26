import { Pool } from 'pg';
import process from "process";

export const pgDbWritePool = new Pool({
        connectionString: process.env.DATABASE_URL,
        max: Number(process.env.POSTGRES_POOL_SIZE) || 20,
        keepAlive: true,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000
});

export const pgDbReadPool = process.env.DATABASE_READ_URL ? new Pool({
        connectionString: process.env.DATABASE_READ_URL,
        max: Number(process.env.POSTGRES_POOL_SIZE) || 20,
        keepAlive: true,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000
}) : pgDbWritePool;

// Default export for backward compatibility (deprecated - use pgDbWritePool or pgDbReadPool)
export default pgDbWritePool;
