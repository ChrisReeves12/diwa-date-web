'use client';

import { useEffect, useState } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { theme, darkTheme } from './theme';

interface DynamicThemeProviderProps {
    children: React.ReactNode;
}

export default function DynamicThemeProvider({ children }: DynamicThemeProviderProps) {
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);

    useEffect(() => {
        // Check initial dark mode preference
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        setIsDarkMode(mediaQuery.matches);
        setIsInitialized(true);

        // Listen for changes to dark mode preference
        const handleChange = (e: MediaQueryListEvent) => {
            setIsDarkMode(e.matches);
        };

        mediaQuery.addEventListener('change', handleChange);
        
        return () => {
            mediaQuery.removeEventListener('change', handleChange);
        };
    }, []);

    // Prevent flash of wrong theme by not rendering until initialized
    if (!isInitialized) {
        return null;
    }

    return (
        <ThemeProvider theme={isDarkMode ? darkTheme : theme}>
            {children}
        </ThemeProvider>
    );
}