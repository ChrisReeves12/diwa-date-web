'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import './site-top-bar.scss';
import NotificationCenter from "@/common/notification-center/notification-center";
import { useCurrentUser } from '../context/current-user-context';
import { User } from '@/types';

interface SiteTopBarProps {
    isLoginPage?: boolean;
    hideButtons?: boolean;
    currentUser?: User;
}

export default function SiteTopBar({ isLoginPage = false, hideButtons = false, currentUser }: SiteTopBarProps) {
    const lCurrentUser = currentUser || useCurrentUser();
    const pathname = usePathname();

    return (
        <>
            <div className={`site-top-bar ${isLoginPage ? 'login' : ''}`}>
                <div className="logo-container">
                    <Link href="/">
                        <span className="light-dark">
                            <span className="light">
                                <img
                                    title="Diwa Date"
                                    alt="Logo"
                                    src="/images/full_logo.svg"
                                    width={130}
                                    height={40}
                                />
                            </span>
                            <span className="dark">
                                <img
                                    title="Diwa Date"
                                    alt="Logo"
                                    src="/images/full_logo_dark.svg"
                                    width={130}
                                    height={40}
                                />
                            </span>
                        </span>
                    </Link>
                </div>
                {lCurrentUser && <NotificationCenter currentUser={lCurrentUser} />}
                {!lCurrentUser && !hideButtons &&
                    <div className="top-button-container">

                        {pathname !== '/registration' && pathname !== '/login' &&
                            <>
                                <Link href="/login" className="top-button">Member Login</Link>
                                <Link href="/registration" className="top-button">Register</Link>
                            </>}

                        {pathname === '/login' && <>
                            <Link href="/" className="top-button">Back To Home</Link>
                            <Link href="/registration" className="top-button">Register</Link>
                        </>}

                        {pathname === '/registration' && <>
                            <Link href="/" className="top-button">Back To Home</Link>
                            <Link href="/login" className="top-button">Member Login</Link>
                        </>}
                    </div>
                }
            </div>
        </>
    );
}
