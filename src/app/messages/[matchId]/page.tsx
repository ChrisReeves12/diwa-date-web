import { Metadata } from "next";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getCurrentUser } from '@/server-side-helpers/user.helpers';
import { getMatchDetails } from '@/server-side-helpers/messages.helpers';
import ChatView from "./chat-view";

export async function generateMetadata({ params }: { params: Promise<{ matchId: string }> }): Promise<Metadata> {
    return {
        title: `${process.env.APP_NAME} | Message`
    };
}

export default async function MessageConversationPage({ params }: { params: Promise<{ matchId: string }> }) {
    const currentUser = await getCurrentUser(await cookies());

    if (!currentUser) {
        redirect('/');
    }

    const resolvedParams = await params;
    const matchIdNumber = parseInt(resolvedParams.matchId, 10);
    if (isNaN(matchIdNumber)) {
        redirect('/messages');
    }

    // Fetch match details on the server
    const matchDetailsResult = await getMatchDetails(matchIdNumber, currentUser.id);

    if (matchDetailsResult.error) {
        // If it's a 403 error (permission denied), redirect to upgrade page
        if (matchDetailsResult.statusCode === 403) {
            redirect('/upgrade');
        }
        // For other errors, redirect to messages list
        redirect('/messages');
    }

    return (
        <ChatView
            currentUser={currentUser}
            matchDetails={matchDetailsResult.data}
        />
    );
}