import { NextRequest, NextResponse } from "next/server";
import {
    countAllMessages,
    countAllNotifications,
    countAllPendingMatches,
    getPendingMatches, getPendingNotifications,
    getReceivedMessages
} from "@/server-side-helpers/notification.helper";
import { authAwareAPIRequest } from "@/server-side-helpers/api.helpers";
import { NotificationResponse } from "@/types/notification-response.interface";
import { User } from "@/types";

export async function GET(request: NextRequest) {
    return authAwareAPIRequest(request, async (user: User) => {
        const [pendingMatches, receivedMessages, receivedNotifications, pendingMatchesCount, receivedMessagesCount, notificationCount] = await Promise.all([
            getPendingMatches(user),
            getReceivedMessages(user),
            getPendingNotifications(user),
            countAllPendingMatches(user),
            countAllMessages(user),
            countAllNotifications(user)
        ]);

        return NextResponse.json<NotificationResponse>({
            pendingMatches,
            receivedMessages,
            pendingMatchesCount,
            receivedMessagesCount,
            receivedNotifications,
            notificationCount
        });
    });
}
