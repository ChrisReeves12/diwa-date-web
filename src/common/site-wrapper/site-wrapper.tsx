'use client';

import { ReactNode, useEffect, useState } from 'react';
import SiteTopBar from '../site-top-bar/site-top-bar';
import './site-wrapper.scss';
import InfoBar from '../site-info-bar/info-bar';
import { Alert, Button } from '@mui/material';

export default function SiteWrapper({ children, hideButtons = false, hideFlashMessage = false }: { children: ReactNode, hideButtons?: boolean, hideFlashMessage?: boolean }) {
    const [alertMessage, setAlertMessage] = useState<string | null>(null);
    const [alertType, setAlertType] = useState<'success' | 'warning' | undefined>();
    const [hideInfoBar, setHideInfoBar] = useState(false);
    useEffect(() => {
        if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
            setAlertMessage(window.localStorage.getItem('FlashSuccessMessage') || window.localStorage.getItem('FlashWarningMessage'));
            setAlertType(window.localStorage.getItem('FlashSuccessMessage') ? 'success' : 'warning');

            setTimeout(() => {
                if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
                    window.localStorage.removeItem('FlashSuccessMessage');
                    window.localStorage.removeItem('FlashWarningMessage');
                }
            }, 500);
        }
    }, []);

    function onCloseAlert(): void {
        if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
            window.localStorage.removeItem('FlashSuccessMessage');
            window.localStorage.removeItem('FlashWarningMessage');
        }
        setAlertMessage(null);
        setAlertType(undefined);
    }

    return (
        <div className={`site-wrapper ${!hideInfoBar ? 'info-bar-shown' : ''}`}>
            {!hideInfoBar && <InfoBar onHide={() => setHideInfoBar(true)} />}
            <SiteTopBar hideButtons={hideButtons} />
            {!hideFlashMessage && alertMessage && alertType &&
                <div style={{ paddingTop: 30 }} className='container'>
                    <Alert
                        severity={alertType}
                        action={
                            <Button onClick={onCloseAlert} color="inherit" size="small">
                                Dismiss
                            </Button>
                        }
                    >
                        {alertMessage}
                    </Alert>
                </div>}
            {children}
        </div>
    );
}
