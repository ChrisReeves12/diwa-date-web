import {
    emitAccountMessage,
    emitNewMatchNotification,
    emitNewMessageNotification,
    emitUserBlocked
} from "@/server-side-helpers/notification-emitter.helper";

describe('Notification Emitter Helpers', () => {
    it('should send message notification to user', async () => {
        await emitNewMessageNotification(80062, {
            id: 'abc',
            matchId: '42',
            content: 'Testing this out',
            userId: '80062',
            displayName: 'Chris Virtuoso',
            userGender: 'male',
            publicMainPhoto: '/path/to/image.jpg',
            age: 41,
            timestamp: 4232,
            createdAt: new Date()
        });
    });

    it('should send blocked notification to user', async () => {
        await emitUserBlocked(80062, {blockedBy: 429, blockedUserId: 80062, timestamp: new Date()});
    });

    it('should send message notification to user', async () => {
        await emitNewMessageNotification(80062, {
            id: 'abc',
            userGender: 'male',
            age: 41,
            matchId: '42',
            timestamp: 42245,
            createdAt: new Date(),
            content: 'Testing this out',
            userId: '80062',
            displayName: 'Chris Virtuoso'
        });
    });

    it('should send match notification to user', async () => {
        await emitNewMatchNotification(80062, {id: 423, sender: {displayName: 'Chris Virtuoso', age: 41, gender: 'male', publicMainPhoto: '', id: 80062, locationName: 'Atlanta'}});
    });

    it('should send an account message to user', async () => {
        await emitAccountMessage(80062, {noticeType: 'approved-photos', message: 'Your photos have been approved by our staff.', data: {photos: [1, 2, 3, 4]}});
    });
});
