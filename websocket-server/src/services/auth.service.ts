import { getSessionData } from '../helpers/session.helpers';

interface AuthSessionData {
    userId: string;
    sessionId: string;
}

export class AuthService {
    private sessionCache: Map<string, { data: AuthSessionData | null; expiry: number }> = new Map();
    private cacheTimeout = 5 * 60 * 1000; // 5 minutes

    async validateSession(sessionToken: string): Promise<AuthSessionData | null> {
        // Check cache first
        const cached = this.sessionCache.get(sessionToken);
        if (cached && cached.expiry > Date.now()) {
            return cached.data;
        }

        try {
            // Get session data directly from Redis
            const sessionData = await getSessionData(sessionToken);
            
            if (!sessionData || !sessionData.userId) {
                this.sessionCache.set(sessionToken, { data: null, expiry: Date.now() + this.cacheTimeout });
                return null;
            }

            const authData: AuthSessionData = {
                userId: sessionData.userId,
                sessionId: sessionToken
            };

            this.sessionCache.set(sessionToken, { data: authData, expiry: Date.now() + this.cacheTimeout });
            return authData;
        } catch (error) {
            console.error('Error validating session:', error);
            return null;
        }
    }

    clearCache(): void {
        this.sessionCache.clear();
    }

    removeFromCache(sessionToken: string): void {
        this.sessionCache.delete(sessionToken);
    }
}