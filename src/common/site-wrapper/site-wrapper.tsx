'use client';

import { ReactNode, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import SiteTopBar from '../site-top-bar/site-top-bar';
import './site-wrapper.scss';
import InfoBar from '../site-info-bar/info-bar';
import { Alert, Button } from '@mui/material';
import Link from "next/link";
import { useCurrentUser } from "@/common/context/current-user-context";

export default function SiteWrapper({ children, hideButtons = false, hideFlashMessage = false }: { children: ReactNode, hideButtons?: boolean, hideFlashMessage?: boolean }) {
    const pathname = usePathname();
    const [alertMessage, setAlertMessage] = useState<string | null>(null);
    const [alertType, setAlertType] = useState<'success' | 'warning' | undefined>();
    const currentUser = useCurrentUser();

    const shouldHideInfoBar = (): boolean => {
        return pathname.startsWith('/profile') ||
               pathname.startsWith('/account') ||
               pathname.startsWith('/likes') ||
               pathname.startsWith('/messages');
    };

    const [hideInfoBar, setHideInfoBar] = useState(shouldHideInfoBar());

    useEffect(() => {
        setHideInfoBar(shouldHideInfoBar());
    }, [pathname]);

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
            {!hideInfoBar && <InfoBar onHide={() => setHideInfoBar(true)}/>}
            <SiteTopBar hideButtons={hideButtons}/>
            {!hideFlashMessage && alertMessage && alertType &&
                <div style={{paddingTop: 30}} className='container'>
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
            {!currentUser && <footer>
                <div className="logo-container">
                    <a href="/">
                        <img src="/images/full_logo_dark.svg"/>
                    </a>
                </div>
                <div className="links-container">
                    <div className="links-section">
                        <h4>Navigation</h4>
                        <ul>
                            <li><Link href="/">Home</Link></li>
                            <li><Link href="/login">Sign In</Link></li>
                            <li><Link href="/registration">Register</Link></li>
                        </ul>
                    </div>
                    <div className="links-section">
                        <h4>Legal &amp; Support</h4>
                        <ul>
                            <li><a href="/privacy-policy">Privacy Policy</a></li>
                            <li><a href="/terms-of-service">Terms of Service</a></li>
                            <li><a href="/dating-saftey">Dating Safety</a></li>
                            <li><a href="/support">Support</a></li>
                        </ul>
                    </div>
                </div>
                <div className="copyright-container">
                    Copyright &copy; {(new Date()).getFullYear()} by Taktyx
                </div>
            </footer>}
        </div>
    );
}
