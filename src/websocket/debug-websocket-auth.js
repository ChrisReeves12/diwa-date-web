/**
 * Debug script for WebSocket authentication issues
 * Run this in the browser console to check authentication status
 */

window.debugWebSocketAuth = function () {
    console.log('=== WebSocket Authentication Debug ===');

    // 1. Check cookies
    const cookies = document.cookie.split(';');
    console.log('All cookies:', cookies.map(c => c.trim()));

    // 2. Check for session cookie with different possible names
    const possibleSessionCookies = ['session_id', 'session-token', 'sessionId'];
    const foundSessionCookies = [];

    possibleSessionCookies.forEach(name => {
        const cookie = cookies.find(c => c.trim().startsWith(`${name}=`));
        if (cookie) {
            foundSessionCookies.push(cookie.trim());
        }
    });

    console.log('Found session cookies:', foundSessionCookies);

    if (foundSessionCookies.length === 0) {
        console.error('❌ No session cookies found. User is likely not logged in.');
        console.log('💡 Try logging in first, then run this debug script again.');
        return;
    }

    // 3. Check current user context
    console.log('Current URL:', window.location.href);
    console.log('Origin:', window.location.origin);

    // 4. Test Socket.IO connection with debug
    console.log('Testing Socket.IO connection...');

    const testSocket = window.io ? window.io() : null;
    if (!testSocket) {
        console.error('❌ Socket.IO client not available. Make sure the page has loaded completely.');
        return;
    }

    testSocket.on('connect', () => {
        console.log('✅ WebSocket connected successfully');
        testSocket.disconnect();
    });

    testSocket.on('connect_error', (error) => {
        console.error('❌ WebSocket connection failed:', error.message);
        console.log('Error details:', error);
        testSocket.disconnect();
    });

    testSocket.on('connection:success', (data) => {
        console.log('✅ WebSocket authenticated:', data);
    });

    // 5. Environment check
    console.log('Environment variables (if available):');
    console.log('- NEXT_PUBLIC_BASE_URL:', process.env?.NEXT_PUBLIC_BASE_URL || 'not set');

    console.log('=== End Debug ===');
};

// Auto-run if script is loaded directly
if (typeof window !== 'undefined') {
    console.log('WebSocket auth debug script loaded. Run debugWebSocketAuth() to test.');
} 