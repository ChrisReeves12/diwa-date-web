import SiteWrapper from '@/common/site-wrapper/site-wrapper';
import Link from 'next/link';
import './not-found.scss';

export const dynamic = 'force-dynamic';

export const metadata = {
    title: `${process.env.APP_NAME} | Page Not Found`,
};

export default function NotFound() {
    return (
        <SiteWrapper hideButtons={true}>
            <div className="not-found-container">
                <div className="not-found-content">
                    <h1 className="not-found-title">404</h1>
                    <h2 className="not-found-subtitle">Page Not Found</h2>
                    <p className="not-found-description">
                        Sorry, the page you are looking for doesn&apos;t exist or has been moved.
                    </p>
                    <div className="not-found-actions">
                        <Link href="/" className="btn-primary">
                            Go Home
                        </Link>
                        <Link href="/login" className="btn-secondary">
                            Sign In
                        </Link>
                    </div>
                </div>
            </div>
        </SiteWrapper>
    );
}
