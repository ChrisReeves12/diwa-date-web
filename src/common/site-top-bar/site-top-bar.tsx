'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import './site-top-bar.scss';
import NotificationCenter from "@/common/notification-center/notification-center";
import { useCurrentUser } from '../context/current-user-context';
interface SiteTopBarProps {
    isLoginPage?: boolean;
}

export default function SiteTopBar({ isLoginPage = false }: SiteTopBarProps) {
    const currentUser = useCurrentUser();
    const pathname = usePathname();

    return (
        <div className={`site-top-bar ${isLoginPage ? 'login' : ''}`}>
            <div className="logo-container">
                <Link href="/">
                    <span className="light-dark">
                        <span className="light">
                            <Image
                                title="Diwa Date"
                                alt="Logo"
                                src="/images/full_logo.png"
                                width={130}
                                height={40}
                                priority
                            />
                        </span>
                        <span className="dark">
                            <Image
                                title="Diwa Date"
                                alt="Logo"
                                src="/images/white_logo.png"
                                width={130}
                                height={40}
                                priority
                            />
                        </span>
                    </span>
                </Link>
            </div>
            {currentUser && <NotificationCenter />}
            {!currentUser &&
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
    );
}
