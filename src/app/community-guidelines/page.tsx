import SiteWrapper from '@/common/site-wrapper/site-wrapper';
import './community-guidelines.scss';
import { getCurrentUser } from '@/server-side-helpers/user.helpers';
import { cookies } from 'next/headers';

export const metadata = {
    title: `${process.env.APP_NAME} | Community Guidelines`,
};

export default async function CommunityGuidelinesPage() {
    const currentUser = await getCurrentUser(await cookies());

    return (
        <SiteWrapper currentUser={currentUser}>
            <div className="community-guidelines-container">
                <h1>Community Guidelines</h1>
                <p>Community Guidelines content coming soon...</p>
            </div>
        </SiteWrapper>
    );
}