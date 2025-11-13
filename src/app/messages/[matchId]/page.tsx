import { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import { cookies } from "next/headers";
import { getCurrentUser } from '@/server-side-helpers/user.helpers';
import { getMatchDetails } from '@/server-side-helpers/messages.helpers';
import { ChatView } from "./chat-view";
import { markConversationsAsAknowledged } from "@/app/messages/messages.actions";

export async function generateMetadata({ params }: { params: Promise<{ matchId: string }> }): Promise<Metadata> {
    return {
        title: `${process.env.APP_NAME} | Message`
    };
}

export default async function MessageConversationPage({ params }: { params: Promise<{ matchId: string }> }) {
    const currentUser = await getCurrentUser(await cookies());

    if (!currentUser) {
        redirect('/login?redirect=/messages');
    }

    const resolvedParams = await params;
    const matchIdNumber = parseInt(resolvedParams.matchId, 10);
    if (isNaN(matchIdNumber)) {
        notFound();
    }

    // Fetch match details on the server
    const matchDetailsResult = await getMatchDetails(matchIdNumber, currentUser.id);

    if (matchDetailsResult.error) {
        if (matchDetailsResult.statusCode === 418) {
            redirect('/upgrade');
        }

        notFound();
    }

    markConversationsAsAknowledged([{matchId: matchIdNumber}]);

    return (
        <ChatView
            currentUser={currentUser}
            matchDetails={matchDetailsResult.data}
        />
    );
}
