'use client';

import React, { useEffect, useState } from 'react';
import AlertDialog from './alert-dialog';
import { registerAlertUpdater, closeAlert } from '@/util';

interface AlertState {
    open: boolean;
    title?: string;
    message: string;
}

export default function GlobalAlertProvider({ children }: { children: React.ReactNode }) {
    const [alertState, setAlertState] = useState<AlertState>({
        open: false,
        message: ''
    });

    useEffect(() => {
        // Register the state updater function with the util module
        registerAlertUpdater(setAlertState);
    }, []);

    const handleClose = () => {
        closeAlert();
    };

    return (
        <>
            {children}
            <AlertDialog
                open={alertState.open}
                title={alertState.title}
                message={alertState.message}
                onClose={handleClose}
            />
        </>
    );
} 