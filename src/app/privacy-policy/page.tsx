import SiteWrapper from '@/common/site-wrapper/site-wrapper';
import './privacy-policy.scss';

export const metadata = {
    title: `${process.env.APP_NAME} | Privacy Policy`,
};

export default function PrivacyPolicyPage() {
    return (
        <SiteWrapper>
            <div className="privacy-policy-container">
                <h1>Privacy Policy</h1>
                <p>Privacy Policy content coming soon...</p>
            </div>
        </SiteWrapper>
    );
}