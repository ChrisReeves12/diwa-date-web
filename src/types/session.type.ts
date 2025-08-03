/**
 * Type for session data stored in Redis
 */
export type SessionData = {
  userId: string;
  email: string;
  createdAt: number;
};

export interface SessionRequestData {
  ipAddress?: string;
  userAgent?: string;
  ipGeoCountry?: string;
  ipGeoCity?: string;
}

export interface SessionInsertData extends SessionRequestData {
  id: string;
  userId: number;
  payload: string;
  lastActivity: number;
}
