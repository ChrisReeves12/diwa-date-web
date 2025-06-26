/**
 * Test script to demonstrate real-time notifications
 * 
 * This can be run from the console or adapted into your existing code
 * to test the notification system.
 */

// Example of how to emit a test notification from browser console
// (This would normally be done server-side)

const testNotification = () => {
    // This is just for testing - normally you'd call the server-side functions

    // To test from browser console when logged in:
    console.log(`
To test notifications from browser console:

1. Open browser console on your site
2. Make sure you're logged in
3. Run this code:

// Test new match notification
const socket = window.io?.();
if (socket && socket.connected) {
    // This simulates receiving a match notification
    socket.emit('debug:simulate', {
        type: 'match:new',
        data: {
            id: Date.now(),
            sender: {
                id: 999,
                locationName: 'Test City, TC',
                gender: 'male',
                displayName: 'Test User',
                age: 25
            }
        }
    });
}

// Test new message notification
if (socket && socket.connected) {
    socket.emit('debug:simulate', {
        type: 'message:new',
        data: {
            id: 'msg_' + Date.now(),
            matchId: 'match_123',
            content: 'Hello! This is a test message.',
            userId: '999',
            displayName: 'Test Sender',
            userGender: 'female',
            age: 24,
            timestamp: Date.now(),
            createdAt: new Date()
        }
    });
}
    `);
};

// Server-side example (what you'd actually use in production)
const serverSideExample = `
// In your server action or API route:
import { emitNewMatchNotification } from '@/server-side-helpers/notification-emitter.helper';

// When a match is created:
await emitNewMatchNotification(recipientUserId, {
    id: matchId,
    sender: {
        id: senderId,
        locationName: userLocation,
        gender: senderGender,
        displayName: senderName,
        age: senderAge,
        publicMainPhoto: senderPhoto
    }
});
`;

console.log('Test notification helper loaded');
console.log('Run testNotification() to see instructions');

module.exports = { testNotification }; 