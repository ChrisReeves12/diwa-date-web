import { Metadata } from "next";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getCurrentUser } from '@/server-side-helpers/user.helpers';
import ChatView from "./chat-view";

export async function generateMetadata({ params }: { params: { matchId: string } }): Promise<Metadata> {
    return {
        title: `${process.env.APP_NAME} | Message`
    };
}

export default async function MessageConversationPage({ params }: { params: { matchId: string } }) {
    const currentUser = await getCurrentUser(await cookies());

    if (!currentUser) {
        redirect('/');
    }

    return (
        <ChatView currentUser={currentUser} />
    );
}