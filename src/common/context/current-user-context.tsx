'use client';

import { User } from '@/types';
import { createContext, useContext, ReactNode } from 'react';

// Create the context with undefined as the default value
const CurrentUserContext = createContext<User | undefined>(undefined);

// Provider component that wraps parts of the app that need access to the user
export function CurrentUserProvider({ 
  children, 
  currentUser 
}: { 
  children: ReactNode; 
  currentUser?: User;
}) {
  return (
    <CurrentUserContext.Provider value={currentUser}>
      {children}
    </CurrentUserContext.Provider>
  );
}

// Custom hook to use the context
export function useCurrentUser() {
  const context = useContext(CurrentUserContext);
  
  // This is not an error, just returning undefined if no user is logged in
  return context;
}
