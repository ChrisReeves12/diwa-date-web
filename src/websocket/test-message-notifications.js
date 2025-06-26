/**
 * Test script for message WebSocket notifications
 * Run this with: node src/websocket/test-message-notifications.js
 */

import { io } from 'socket.io-client';

// Replace with actual user session cookies from your browser
const USER_1_COOKIE = 'session_id=your_session_cookie_here_user1';
const USER_2_COOKIE = 'session_id=your_session_cookie_here_user2';

const WEBSOCKET_URL = 'http://localhost:3000';

function createTestClient(sessionCookie, userName) {
    const client = io(WEBSOCKET_URL, {
        extraHeaders: {
            Cookie: sessionCookie
        },
        transports: ['websocket']
    });

    client.on('connect', () => {
        console.log(`${userName} connected with socket ID:`, client.id);
    });

    client.on('disconnect', () => {
        console.log(`${userName} disconnected`);
    });

    client.on('error', (error) => {
        console.error(`${userName} error:`, error);
    });

    // Listen for message events
    client.on('message:new', (data) => {
        console.log(`${userName} received new message:`, {
            messageId: data.id,
            matchId: data.matchId,
            content: data.content,
            fromUser: data.displayName,
            gender: data.userGender,
            age: data.age,
            timestamp: new Date(data.timestamp).toLocaleTimeString()
        });
    });

    // Listen for other notification events too
    client.on('match:new', (data) => {
        console.log(`${userName} received new match:`, data);
    });

    client.on('notification:new', (data) => {
        console.log(`${userName} received new notification:`, data);
    });

    client.on('match:cancelled', (data) => {
        console.log(`${userName} received match cancellation:`, data);
    });

    return client;
}

async function testMessageNotifications() {
    console.log('💬 Testing Message WebSocket Notifications\n');

    // Create two test clients
    const user1 = createTestClient(USER_1_COOKIE, 'User1');
    const user2 = createTestClient(USER_2_COOKIE, 'User2');

    // Wait for connections
    await new Promise(resolve => {
        let connected = 0;
        const checkConnected = () => {
            connected++;
            if (connected === 2) resolve();
        };
        user1.on('connect', checkConnected);
        user2.on('connect', checkConnected);
    });

    console.log('✅ Both users connected\n');

    console.log('📝 Test Steps:');
    console.log('1. User1 should send a message to User2 (via chat UI in app)');
    console.log('2. User2 should see message:new event with message details');
    console.log('3. User2 should send a reply to User1 (via chat UI in app)');
    console.log('4. User1 should see message:new event with reply details');
    console.log('\nListening for events... (Press Ctrl+C to exit)\n');

    // Keep the script running
    process.on('SIGINT', () => {
        console.log('\n\n🛑 Shutting down test clients...');
        user1.disconnect();
        user2.disconnect();
        process.exit(0);
    });
}

// Run the test
testMessageNotifications().catch(console.error); 