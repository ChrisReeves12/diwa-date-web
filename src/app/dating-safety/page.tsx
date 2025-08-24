import SiteWrapper from '@/common/site-wrapper/site-wrapper';
import './dating-safety.scss';

export const metadata = {
    title: `${process.env.APP_NAME} | Dating Safety`,
};

export default function DatingSafetyPage() {
    return (
        <SiteWrapper>
            <div className="dating-safety-container">
                <h1>Dating Safety</h1>
                <p>Dating Safety content coming soon...</p>
            </div>
        </SiteWrapper>
    );
}