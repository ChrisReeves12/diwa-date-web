import { User } from './user.interface';

/**
 * Type for authentication result
 */
export type AuthResult = {
  success: boolean;
  user?: User;
  sessionId?: string;
  message?: string;
  requiresTwoFactor?: boolean;
  userId?: number;
  twoFactorMessage?: string;
};
