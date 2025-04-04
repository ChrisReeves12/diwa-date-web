/**
 * Type for session data stored in Redis
 */
export type SessionData = {
  userId: string;
  email: string;
  createdAt: number;
};
