import SupportCenterView from './support-center-view';
import { getCurrentUser } from '@/server-side-helpers/user.helpers';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import './support.scss';

export const metadata = {
    title: `${process.env.APP_NAME} | Support`,
};

export default async function SupportPage() {
    const currentUser = await getCurrentUser(await cookies());
    
    if (!currentUser) {
        redirect('/login');
    }

    return <SupportCenterView currentUser={currentUser} />;
}
