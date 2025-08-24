import SiteWrapper from '@/common/site-wrapper/site-wrapper';
import './support.scss';

export const metadata = {
    title: `${process.env.APP_NAME} | Support`,
};

export default function SupportPage() {
    return (
        <SiteWrapper>
            <div className="support-container">
                <h1>Support</h1>
                <p>Support content coming soon...</p>
            </div>
        </SiteWrapper>
    );
}