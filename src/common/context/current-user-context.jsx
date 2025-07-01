"use strict";
'use client';
Object.defineProperty(exports, "__esModule", { value: true });
exports.CurrentUserProvider = CurrentUserProvider;
exports.useCurrentUser = useCurrentUser;
exports.useCurrentUserContext = useCurrentUserContext;
const react_1 = require("react");
// Create the context with undefined as the default value
const CurrentUserContext = (0, react_1.createContext)(undefined);
// Provider component that wraps parts of the app that need access to the user
function CurrentUserProvider({ children, currentUser }) {
    const [user, setUser] = (0, react_1.useState)(currentUser);
    const updateUser = (0, react_1.useCallback)((updates) => {
        setUser(prevUser => {
            if (!prevUser)
                return prevUser;
            return Object.assign(Object.assign({}, prevUser), updates);
        });
    }, []);
    const refreshUser = (0, react_1.useCallback)(async () => {
        try {
            // Fetch fresh user data from the server
            const response = await fetch('/api/user/current');
            if (response.ok) {
                const userData = await response.json();
                setUser(userData);
            }
        }
        catch (error) {
            console.error('Failed to refresh user data:', error);
        }
    }, []);
    const contextValue = {
        user,
        updateUser,
        refreshUser
    };
    return (<CurrentUserContext.Provider value={contextValue}>
      {children}
    </CurrentUserContext.Provider>);
}
// Custom hook to use the context
function useCurrentUser() {
    const context = (0, react_1.useContext)(CurrentUserContext);
    if (!context) {
        // Return a fallback object for backward compatibility
        return undefined;
    }
    return context.user;
}
// Custom hook to use the full context with update capabilities
function useCurrentUserContext() {
    const context = (0, react_1.useContext)(CurrentUserContext);
    if (!context) {
        throw new Error('useCurrentUserContext must be used within a CurrentUserProvider');
    }
    return context;
}
//# sourceMappingURL=current-user-context.jsx.map