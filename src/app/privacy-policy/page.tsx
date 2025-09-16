import SiteWrapper from '@/common/site-wrapper/site-wrapper';
import './privacy-policy.scss';
import { getCurrentUser } from '@/server-side-helpers/user.helpers';
import { cookies } from 'next/headers';

export const metadata = {
    title: `${process.env.APP_NAME} | Privacy Policy`,
};

export default async function PrivacyPolicyPage() {
    const currentUser = await getCurrentUser(await cookies());

    return (
        <SiteWrapper currentUser={currentUser}>
            <div className="privacy-policy-container">
                <h1>Privacy Policy</h1>
                <p>Privacy Policy content coming soon...</p>
            </div>
        </SiteWrapper>
    );
}