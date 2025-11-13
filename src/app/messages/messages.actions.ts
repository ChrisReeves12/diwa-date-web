'use server';

import {
    getConversationsFromMatches,
    getMessagesForMatch,
    sendMessage,
    markMessagesAsRead,
    getMatchDetails,
    markMatchesAsRead
} from '@/server-side-helpers/messages.helpers';
import { getCurrentUser } from '@/server-side-helpers/user.helpers';
import { cookies } from 'next/headers';
import { prismaRead } from '@/lib/prisma';
import { emitMessageRead, emitMessageTyping } from "@/server-side-helpers/notification-emitter.helper";

/**
 * Get all conversations for the current user.
 * This is used for client-side fetching of updated conversations.
 */
export async function getConversations() {
    try {
        const currentUser = await getCurrentUser(await cookies());

        if (!currentUser) {
            return {
                error: 'Authentication required.',
                statusCode: 401
            };
        }

        const conversations = await getConversationsFromMatches(currentUser.id);
        return { data: conversations, statusCode: 200 };
    } catch (error) {
        console.error('Error fetching conversations:', error);
        return {
            error: 'Failed to fetch conversations. Please try again later.',
            statusCode: 500
        };
    }
}

export async function sendTypingNotification(recipientId: number, senderId: number) {
    if (!recipientId || isNaN(recipientId)) {
        return;
    }

    return emitMessageTyping(recipientId, { typingBy: senderId.toString(), timestamp: new Date() });
}

export async function sendReadReceipt(recipientId: number, matchId: number, messageId: number) {
    try {
        const currentUser = await getCurrentUser(await cookies());

        if (!currentUser) {
            return {
                error: 'Authentication required.',
                statusCode: 401
            };
        }

        if (isNaN(matchId)) {
            return {
                error: 'Invalid match ID.',
                statusCode: 400
            };
        }

        return await emitMessageRead(recipientId, { messageId: messageId.toString(), conversationId: matchId.toString(), readBy: currentUser.id.toString(), timestamp: new Date() });
    } catch (error) {
        console.error('Error in sendReadReceipt:', error);
        return {
            error: 'Failed to send read receipt. Please try again later.',
            statusCode: 500
        };
    }
}


/**
 * Get all messages for a specific chat conversation.
 * @param matchId The match ID as a string
 * @returns Messages with sender details or error
 */
export async function getChatMessages(
    matchId: string,
    options: {
        limit?: number;
        cursor?: number;
        direction?: 'before' | 'after';
    } = {}
) {
    try {
        const currentUser = await getCurrentUser(await cookies());

        if (!currentUser) {
            return {
                error: 'Authentication required.',
                statusCode: 401
            };
        }

        const matchIdNumber = parseInt(matchId, 10);
        if (isNaN(matchIdNumber)) {
            return {
                error: 'Invalid match ID.',
                statusCode: 400
            };
        }

        return await getMessagesForMatch(matchIdNumber, currentUser.id, options);
    } catch (error) {
        console.error('Error in getChatMessages:', error);
        return {
            error: 'Failed to fetch messages. Please try again later.',
            statusCode: 500
        };
    }
}

/**
 * Send a new message in a chat conversation.
 * @param matchId The match ID as a string
 * @param content The message content
 * @returns Success status or error
 */
export async function sendChatMessage(matchId: string, content: string) {
    try {
        const currentUser = await getCurrentUser(await cookies());

        if (!currentUser) {
            return {
                error: 'Authentication required.',
                statusCode: 401
            };
        }

        const matchIdNumber = parseInt(matchId, 10);
        if (isNaN(matchIdNumber)) {
            return {
                error: 'Invalid match ID.',
                statusCode: 400
            };
        }

        if (!content || content.trim().length === 0) {
            return {
                error: 'Message content cannot be empty.',
                statusCode: 400
            };
        }

        if (content.length > 1000) {
            return {
                error: 'Message is too long. Maximum 1000 characters allowed.',
                statusCode: 400
            };
        }

        // We need to determine the recipient ID from the match
        // This requires getting match details first
        const match = await prismaRead.userMatches.findFirst({
            where: {
                id: matchIdNumber,
                OR: [
                    { userId: currentUser.id },
                    { recipientId: currentUser.id }
                ],
                status: 'matched'
            }
        });

        if (!match) {
            return {
                error: 'Match not found or you do not have access to this conversation.',
                statusCode: 404
            };
        }

        // Determine the recipient (the other user in the match)
        const recipientId = match.userId === currentUser.id ? match.recipientId : match.userId;

        return await sendMessage(content.trim(), currentUser.id, recipientId, matchIdNumber);
    } catch (error) {
        console.error('Error in sendChatMessage:', error);
        return {
            error: 'Failed to send message. Please try again later.',
            statusCode: 500
        };
    }
}

/**
 * Mark all unread messages in a chat as read.
 * @param matchId The match ID as a string
 * @returns Success status or error
 */
export async function updateMessagesAsRead(matchId: string) {
    try {
        const currentUser = await getCurrentUser(await cookies());

        if (!currentUser) {
            return {
                error: 'Authentication required.',
                statusCode: 401
            };
        }

        const matchIdNumber = parseInt(matchId, 10);
        if (isNaN(matchIdNumber)) {
            return {
                error: 'Invalid match ID.',
                statusCode: 400
            };
        }

        return await markMessagesAsRead(matchIdNumber, currentUser.id);
    } catch (error) {
        console.error('Error in markChatAsRead:', error);
        return {
            error: 'Failed to mark messages as read. Please try again later.',
            statusCode: 500
        };
    }
}

/**
 * Get match details and other user information for chat header.
 * @param matchId The match ID as a string
 * @returns Match details with other user info or error
 */
export async function getChatMatchDetails(matchId: string) {
    try {
        const currentUser = await getCurrentUser(await cookies());

        if (!currentUser) {
            return {
                error: 'Authentication required.',
                statusCode: 401
            };
        }

        const matchIdNumber = parseInt(matchId, 10);
        if (isNaN(matchIdNumber)) {
            return {
                error: 'Invalid match ID.',
                statusCode: 400
            };
        }

        return await getMatchDetails(matchIdNumber, currentUser.id);
    } catch (error) {
        console.error('Error in getChatMatchDetails:', error);
        return {
            error: 'Failed to fetch match details. Please try again later.',
            statusCode: 500
        };
    }
}

/**
 * Mark conversations as "seen" and removes notifications.
 * @param conversations
 */
export async function markConversationsAsAknowledged(conversations: {matchId: number}[]) {
    try {
        const currentUser = await getCurrentUser(await cookies());

        if (!currentUser) {
            return {
                error: 'Authentication required.',
                statusCode: 401
            };
        }

        return await markMatchesAsRead(currentUser.id, conversations);
    } catch (error) {
        console.error('Error in markConversationsAsAknowledged:', error);
        return {
            error: 'Failed to mark conversations as aknowledged.',
            statusCode: 500
        };
    }
}
