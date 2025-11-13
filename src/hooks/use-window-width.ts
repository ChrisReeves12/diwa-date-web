import { useState, useEffect } from 'react';

export function useWindowWidth() {
    const [innerWidth, setInnerWidth] = useState(() => {
        if (typeof window !== 'undefined') {
            return window.innerWidth;
        }
        return 0;
    });

    useEffect(() => {
        const handler = () => {
            setInnerWidth(window.innerWidth);
            console.log('Inner Width', window.innerWidth);
        };

        window.addEventListener('resize', handler);

        return () => window.removeEventListener('resize', handler);
    }, []);

    return innerWidth;
}
