'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import './site-top-bar.scss';
import NotificationCenter from "@/common/notification-center/notification-center";
import { useCurrentUser } from '../context/current-user-context';
import { useWindowWidth } from "@/hooks/use-window-width";
interface SiteTopBarProps {
    isLoginPage?: boolean;
    hideButtons?: boolean;
}

export default function SiteTopBar({ isLoginPage = false, hideButtons = false }: SiteTopBarProps) {
    const currentUser = useCurrentUser();
    const pathname = usePathname();
    const innerWidth = window?.innerWidth || 0;

    return (
        <>
            <div className={`site-top-bar ${isLoginPage ? 'login' : ''}`}>
                <div className="logo-container">
                    <Link href="/">
                        <span className="light-dark">
                            <span className="light">
                                {innerWidth <= 768 ? <img
                                    title="Diwa Date"
                                    alt="Logo"
                                    src={`${process.env.NEXT_PUBLIC_IMAGE_ROOT}/images/mobile_logo.png`}
                                    width={50}
                                    height={50}
                                /> : <img
                                    title="Diwa Date"
                                    alt="Logo"
                                    src={`${process.env.NEXT_PUBLIC_IMAGE_ROOT}/images/full_logo.png`}
                                    width={130}
                                    height={40}
                                />}
                            </span>
                            <span className="dark">
                                {innerWidth <= 768 ? <img
                                    title="Diwa Date"
                                    alt="Logo"
                                    src={`${process.env.NEXT_PUBLIC_IMAGE_ROOT}/images/mobile_logo_dark.png`}
                                    width={50}
                                    height={50}
                                /> : <img
                                    title="Diwa Date"
                                    alt="Logo"
                                    src={`${process.env.NEXT_PUBLIC_IMAGE_ROOT}/images/full_logo_dark.png`}
                                    width={130}
                                    height={40}
                                />}
                            </span>
                        </span>
                    </Link>
                </div>
                {currentUser && <NotificationCenter />}
                {!currentUser && !hideButtons &&
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
