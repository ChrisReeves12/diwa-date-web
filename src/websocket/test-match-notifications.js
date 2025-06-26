/**
 * Test script for match notifications
 * 
 * This script demonstrates how the match notification system works
 * and can be used for testing purposes.
 */

console.log('Match Notification Test Script Loaded');

// Test data for simulating notifications
const testMatchData = {
    id: Date.now(),
    sender: {
        id: 123,
        locationName: 'San Francisco, CA',
        gender: 'male',
        displayName: 'John Doe',
        age: 28,
        publicMainPhoto: '/images/test-photo.jpg'
    }
};

const testNotificationData = {
    id: Date.now() + 1,
    sender: {
        id: 456,
        locationName: 'Los Angeles, CA',
        gender: 'female',
        displayName: 'Jane Smith',
        age: 26,
        publicMainPhoto: '/images/test-photo-2.jpg'
    }
};

window.testMatchNotifications = function () {
    console.log('=== Testing Match Notifications ===');

    const socket = window.io && window.io();
    if (!socket) {
        console.error('❌ Socket.IO not available');
        return;
    }

    console.log('✅ Socket.IO available, connection status:', socket.connected);

    if (!socket.connected) {
        console.warn('⚠️ Socket not connected. Make sure you are logged in and WebSocket authentication is working.');
        return;
    }

    console.log('🧪 Simulating match notifications...');

    // Simulate receiving a pending like
    console.log('📨 Simulating pending like notification...');
    socket.emit('debug:simulate', {
        type: 'match:new',
        data: testMatchData
    });

    setTimeout(() => {
        // Simulate receiving a confirmed match notification
        console.log('🎉 Simulating confirmed match notification...');
        socket.emit('debug:simulate', {
            type: 'notification:new',
            data: testNotificationData
        });
    }, 2000);

    console.log('✅ Test notifications sent. Check the notification center for animations!');
    console.log('💡 You should see:');
    console.log('   1. Hearts icon should pulse (pending like)');
    console.log('   2. After 2 seconds, bell icon should pulse (confirmed match)');
};

// Instructions for manual testing
console.log(`
🧪 MATCH NOTIFICATION TESTING

1. Make sure you're logged in
2. Open browser console
3. Run: testMatchNotifications()

Or test real notifications:
1. Open two browser windows with different users
2. Send a like from User A to User B
3. User B should see a real-time pending like notification
4. User B likes User A back
5. User A should see a real-time confirmed match notification

Integration points added to:
- sendUserMatchRequest(): Emits pending like notifications
- Line ~601: Emits confirmed match notifications
`);

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { testMatchNotifications };
} 