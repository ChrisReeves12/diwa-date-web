import { pgDbWritePool } from '@/lib/postgres';
import { SessionInsertData } from '@/types/session.type';

export async function getIPGeolocation(ipAddress: string): Promise<{country?: string, city?: string}> {
  try {
    if (!process.env.IP2LOCATION_KEY) {
      return {};
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    const response = await fetch(
      `https://api.ip2location.io/?key=${process.env.IP2LOCATION_KEY}&ip=${ipAddress}`,
      {
        signal: controller.signal,
        headers: {
          'User-Agent': 'diwa-date-web/1.0'
        }
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`IP2Location API error: ${response.status} ${response.statusText}`);
      return {};
    }

    const data = await response.json();

    return {
      country: data.country_name || undefined,
      city: data.city_name || undefined
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn('IP2Location API request timed out');
    } else {
      console.warn('Error fetching IP geolocation:', error);
    }
    return {};
  }
}

export async function createSessionRecord(sessionData: SessionInsertData): Promise<void> {
  try {
    const query = `
      INSERT INTO sessions ("id", "userId", "ipAddress", "userAgent", "payload", "lastActivity", "ipGeoCountry", "ipGeoCity")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `;

    const values = [
      sessionData.id,
      sessionData.userId,
      sessionData.ipAddress || null,
      sessionData.userAgent || null,
      sessionData.payload,
      sessionData.lastActivity,
      sessionData.ipGeoCountry || null,
      sessionData.ipGeoCity || null
    ];

    await pgDbWritePool.query(query, values);
  } catch (error) {
    // Log error but don't throw - session creation should not fail due to logging issues
    console.error('Failed to create session record in database:', error);
  }
}
