import { User } from './user.type';

/**
 * Type for authentication result
 */
export type AuthResult = {
  success: boolean;
  user?: User;
  sessionId?: string;
  message?: string;
};
