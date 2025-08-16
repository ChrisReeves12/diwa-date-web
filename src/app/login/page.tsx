import SiteWrapper from '@/common/site-wrapper/site-wrapper';
import LoginForm from './login-form';
import { Suspense } from 'react';

export const dynamic = 'force-dynamic';

export const metadata = {
    title: `${process.env.APP_NAME} | Sign In`,
};

export default function LoginPage() {
    return (
        <SiteWrapper hideFlashMessage={true}>
            <Suspense fallback={<div>Loading...</div>}>
                <LoginForm />
            </Suspense>
        </SiteWrapper>
    );
}
