import './messages.scss';
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import ConversationsView from './conversations-view';
import { getCurrentUser } from '@/server-side-helpers/user.helpers';
import { getConversationsFromMatches } from '@/server-side-helpers/messages.helpers';

export async function generateMetadata(): Promise<Metadata> {
    return {
        title: `${process.env.APP_NAME} | Messages`
    };
}

export default async function MessageConversationsPage() {
    const currentUser = await getCurrentUser(await cookies());

    if (!currentUser) {
        redirect('/login?redirect=/messages');
    }

    return <ConversationsView
        conversations={await getConversationsFromMatches(currentUser.id)}
        currentUser={currentUser} />
}