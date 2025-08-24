import SiteWrapper from '@/common/site-wrapper/site-wrapper';
import './terms-of-service.scss';

export const metadata = {
    title: `${process.env.APP_NAME} | Terms of Service`,
};

export default function TermsOfServicePage() {
    return (
        <SiteWrapper>
            <div className="terms-of-service-container">
                <h1>Terms of Service</h1>
                <p>Terms of Service content coming soon...</p>
            </div>
        </SiteWrapper>
    );
}