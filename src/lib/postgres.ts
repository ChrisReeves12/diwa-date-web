import { Pool } from 'pg';
import process from "process";
import * as fs from "node:fs";

const pgDbPool = new Pool({
    ...{
        connectionString: process.env.DATABASE_URL,
        max: Number(process.env.POSTGRES_POOL_SIZE) || 20,
        keepAlive: true,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000
    }, ...(process.env.POSTGRES_CA_CERT_PATH ? {
        ssl: {
            rejectUnauthorized: true,
            ca: fs.readFileSync(process.env.POSTGRES_CA_CERT_PATH as string).toString()
        }
    } : {})
});

export default pgDbPool;
