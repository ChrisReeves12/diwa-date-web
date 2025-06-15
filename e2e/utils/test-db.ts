import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables for tests
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Create a test-specific database pool
const testDbPool = new Pool({
    host: process.env.POSTGRES_HOST,
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    database: process.env.POSTGRES_DATABASE,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

export async function cleanupUserByEmail(email: string) {
    try {
        const result = await testDbPool.query('DELETE FROM users WHERE email = $1', [email]);
        console.log(`Deleted ${result.rowCount} user(s) with email: ${email}`);
    } catch (error) {
        console.error('Error cleaning up test user:', error);
        throw error;
    }
}

export async function createTestUser(userData: any) {
    try {
        const result = await testDbPool.query(
            'INSERT INTO users (email, first_name, last_name, password, created_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING *',
            [userData.email, userData.firstName, userData.lastName, userData.hashedPassword]
        );
        return result.rows[0];
    } catch (error) {
        console.error('Error creating test user:', error);
        throw error;
    }
}

// Clean up the pool when tests are done
process.on('exit', () => {
    testDbPool.end();
});

export default testDbPool; 