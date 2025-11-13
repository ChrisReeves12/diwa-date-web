import {
    emitAccountMessage, emitMatchCanceled,
    emitNewMatchNotification,
    emitNewMessageNotification,
    emitUserBlocked, emitUserUnblocked
} from "@/server-side-helpers/notification-emitter.helper";

describe('Notification Emitter Helpers', () => {
    it('should send message notification to user', async () => {
        await emitNewMessageNotification(80062, {
            id: 'abc',
            matchId: '11',
            content: 'Testing this out',
            userId: '49151',
            displayName: 'Frances.Okuneva',
            userGender: 'female',
            publicMainPhoto: 'random_images/34.jpg',
            age: 61,
            timestamp: 4232,
            createdAt: new Date()
        });
    });

    it('should send blocked notification to user', async () => {
        await emitUserBlocked(80062, {blockedBy: 49151, blockedUserId: 80062, timestamp: new Date()});
    });

    it('should send unblocked notification to user', async () => {
        await emitUserUnblocked(80062, {unblockedBy: 49151, unblockedUserId: 80062, timestamp: new Date()});
    });

    it('should send match notification to user', async () => {
        await emitNewMatchNotification(80062, {
            id: 11,
            sender: {
                displayName: 'Frances.Okuneva',
                age: 61,
                gender: 'female',
                publicMainPhoto: '',
                id: 49151,
                locationName: 'Delta, LA, USA'
            }
        });
    });

    it('should send canceled match notification to user', async () => {
        await emitMatchCanceled(80062, {id: 423, canceledBy: 49151});
    });

    it('should send an account message to user', async () => {
        await emitAccountMessage(80062, {noticeType: 'approved-photos', message: 'Your photos have been approved by our staff.', data: {photos: [1, 2, 3, 4]}});
    });
});
