import { Pool } from 'pg';
import process from "process";

const pgDbPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: Number(process.env.POSTGRES_POOL_SIZE) || 20,
    keepAlive: true,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000
});

export default pgDbPool;
