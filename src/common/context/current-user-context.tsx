'use client';

import { User } from '@/types';
import { createContext, useContext, ReactNode, useState, useCallback } from 'react';

interface CurrentUserContextType {
  user: User | undefined;
  updateUser: (updates: Partial<User>) => void;
  refreshUser: () => Promise<void>;
}

// Create the context with undefined as the default value
const CurrentUserContext = createContext<CurrentUserContextType | undefined>(undefined);

// Provider component that wraps parts of the app that need access to the user
export function CurrentUserProvider({ 
  children, 
  currentUser 
}: { 
  children: ReactNode; 
  currentUser?: User;
}) {
  const [user, setUser] = useState<User | undefined>(currentUser);

  const updateUser = useCallback((updates: Partial<User>) => {
    setUser(prevUser => {
      if (!prevUser) return prevUser;
      return { ...prevUser, ...updates };
    });
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      // Fetch fresh user data from the server
      const response = await fetch('/api/user/current');
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      }
    } catch (error) {
      console.error('Failed to refresh user data:', error);
    }
  }, []);

  const contextValue: CurrentUserContextType = {
    user,
    updateUser,
    refreshUser
  };

  return (
    <CurrentUserContext.Provider value={contextValue}>
      {children}
    </CurrentUserContext.Provider>
  );
}

// Custom hook to use the context
export function useCurrentUser() {
  const context = useContext(CurrentUserContext);
  
  if (!context) {
    // Return a fallback object for backward compatibility
    return undefined;
  }
  
  return context.user;
}

// Custom hook to use the full context with update capabilities
export function useCurrentUserContext() {
  const context = useContext(CurrentUserContext);
  
  if (!context) {
    throw new Error('useCurrentUserContext must be used within a CurrentUserProvider');
  }
  
  return context;
}
