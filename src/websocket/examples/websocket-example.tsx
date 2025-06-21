'use client';

import { useEffect, useState } from 'react';
import { useWebSocket } from '@/hooks/use-websocket';

export function WebSocketExample() {
    const {
        status,
        isConnected,
        on,
        off,
        sendMessage,
        markNotificationRead,
        getOnlineUsers
    } = useWebSocket();

    const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
    const [messages, setMessages] = useState<Array<{ id: string; content: string; timestamp: Date }>>([]);
    const [notifications, setNotifications] = useState<Array<{ id: string; title: string; read: boolean }>>([]);

    useEffect(() => {
        // Listen for new messages
        const handleNewMessage = (data: any) => {
            setMessages(prev => [...prev, {
                id: data.id,
                content: data.content,
                timestamp: new Date(data.timestamp)
            }]);
        };

        // Listen for new notifications
        const handleNewNotification = (data: any) => {
            setNotifications(prev => [...prev, {
                id: data.id,
                title: data.title,
                read: false
            }]);
        };

        // Listen for user status changes
        const handleUserOnline = (data: any) => {
            setOnlineUsers(prev => [...prev, data.userId]);
        };

        const handleUserOffline = (data: any) => {
            setOnlineUsers(prev => prev.filter(id => id !== data.userId));
        };

        // Subscribe to events
        on('message:new', handleNewMessage);
        on('notification:new', handleNewNotification);
        on('user:online', handleUserOnline);
        on('user:offline', handleUserOffline);

        // Get initial online users
        if (isConnected) {
            getOnlineUsers().then(users => setOnlineUsers(users));
        }

        // Cleanup
        return () => {
            off('message:new', handleNewMessage);
            off('notification:new', handleNewNotification);
            off('user:online', handleUserOnline);
            off('user:offline', handleUserOffline);
        };
    }, [isConnected, on, off, getOnlineUsers]);

    const handleSendMessage = async () => {
        const result = await sendMessage('conversation123', 'Hello from WebSocket!');
        if (result.success) {
            console.log('Message sent successfully:', result.messageId);
        } else {
            console.error('Failed to send message:', result.error);
        }
    };

    const handleMarkNotificationRead = (notificationId: string) => {
        markNotificationRead(notificationId);
        setNotifications(prev =>
            prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
        );
    };

    return (
        <div className="p-4">
            <h2 className="text-2xl font-bold mb-4">WebSocket Example</h2>

            <div className="mb-4">
                <span className="font-semibold">Connection Status: </span>
                <span className={`${status === 'connected' ? 'text-green-600' :
                        status === 'error' ? 'text-red-600' :
                            'text-yellow-600'
                    }`}>
                    {status}
                </span>
            </div>

            <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2">Online Users ({onlineUsers.length})</h3>
                <div className="flex gap-2">
                    {onlineUsers.map(userId => (
                        <span key={userId} className="px-2 py-1 bg-green-100 rounded">
                            {userId}
                        </span>
                    ))}
                </div>
            </div>

            <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2">Notifications</h3>
                {notifications.map(notification => (
                    <div key={notification.id} className="flex items-center gap-2 mb-2">
                        <span className={notification.read ? 'text-gray-500' : ''}>
                            {notification.title}
                        </span>
                        {!notification.read && (
                            <button
                                onClick={() => handleMarkNotificationRead(notification.id)}
                                className="text-sm text-blue-600 hover:underline"
                            >
                                Mark as read
                            </button>
                        )}
                    </div>
                ))}
            </div>

            <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2">Messages</h3>
                <div className="border rounded p-2 h-32 overflow-y-auto mb-2">
                    {messages.map(message => (
                        <div key={message.id} className="mb-1">
                            <span className="text-sm text-gray-500">
                                {message.timestamp.toLocaleTimeString()}
                            </span>
                            {' - '}
                            {message.content}
                        </div>
                    ))}
                </div>
                <button
                    onClick={handleSendMessage}
                    disabled={!isConnected}
                    className="px-4 py-2 bg-blue-600 text-white rounded disabled:bg-gray-400"
                >
                    Send Test Message
                </button>
            </div>
        </div>
    );
} 