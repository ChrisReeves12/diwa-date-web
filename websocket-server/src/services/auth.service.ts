interface SessionData {
    userId: string;
    sessionId: string;
}

export class AuthService {
    private sessionValidationUrl: string;
    private sessionCache: Map<string, { data: SessionData | null; expiry: number }> = new Map();
    private cacheTimeout = 5 * 60 * 1000; // 5 minutes

    constructor(sessionValidationUrl: string) {
        this.sessionValidationUrl = sessionValidationUrl;
    }

    async validateSession(sessionToken: string): Promise<SessionData | null> {
        // Check cache first
        const cached = this.sessionCache.get(sessionToken);
        if (cached && cached.expiry > Date.now()) {
            return cached.data;
        }

        try {
            // Make request to the NextJS app to validate the session
            const response = await fetch(this.sessionValidationUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Internal-Request': 'true'
                },
                body: JSON.stringify({ sessionToken })
            });

            if (!response.ok) {
                this.sessionCache.set(sessionToken, { data: null, expiry: Date.now() + this.cacheTimeout });
                return null;
            }

            const data = await response.json() as SessionData;
            this.sessionCache.set(sessionToken, { data, expiry: Date.now() + this.cacheTimeout });
            return data;
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