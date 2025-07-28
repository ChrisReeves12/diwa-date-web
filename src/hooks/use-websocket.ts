import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import {
    ServerToClientEvents,
    ClientToServerEvents
} from '@/types/websocket-events.types';

type WebSocketStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export function useWebSocket() {
    const [status, setStatus] = useState<WebSocketStatus>('disconnected');
    const [isConnected, setIsConnected] = useState(false);
    const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);

    useEffect(() => {
        // Don't initialize the socket if we're on the server side
        if (typeof window === 'undefined') {
            return;
        }

        // Get WebSocket configuration
        const { url, options } = {
            url: process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'http://localhost:3001',
            options: {
                withCredentials: true,
                transports: ['websocket', 'polling'],
                reconnection: true,
                reconnectionDelay: 1000,
                reconnectionDelayMax: 5000,
                reconnectionAttempts: 5
            }
        };

        console.log('Initializing WebSocket connection to:', url);

        // Initialize socket connection
        const socket = io(url, {
            ...options,
            timeout: 20000,
            forceNew: true,
            extraHeaders: {
                'Access-Control-Allow-Credentials': 'true'
            }
        });

        socketRef.current = socket;
        setStatus('connecting');

        // Connection event handlers
        socket.on('connect', () => {
            console.log('WebSocket connected with ID:', socket.id);
            setStatus('connected');
            setIsConnected(true);
        });

        socket.on('disconnect', (reason) => {
            console.log('WebSocket disconnected. Reason:', reason);
            setStatus('disconnected');
            setIsConnected(false);
        });

        socket.on('connect_error', (error) => {
            console.error('WebSocket connection error:', error.message);
            console.error('Error details:', error);
            setStatus('error');
            setIsConnected(false);
        });

        socket.on('connection:success', (data) => {
            console.log('WebSocket authenticated successfully:', data);
        });

        // Add reconnection attempt logging
        socket.on('reconnect', (attemptNumber) => {
            console.log('WebSocket reconnected after', attemptNumber, 'attempts');
        });

        socket.on('reconnect_attempt', (attemptNumber) => {
            console.log('WebSocket reconnection attempt:', attemptNumber);
        });

        socket.on('reconnect_error', (error) => {
            console.error('WebSocket reconnection error:', error);
        });

        socket.on('reconnect_failed', () => {
            console.error('WebSocket reconnection failed after max attempts');
            setStatus('error');
        });

        // Cleanup on unmount
        return () => {
            console.log('Cleaning up WebSocket connection');
            socket.removeAllListeners();
            socket.close();
            socketRef.current = null;
            setStatus('disconnected');
            setIsConnected(false);
        };
    }, []);

    // Subscribe to events
    const on = useCallback(<K extends keyof ServerToClientEvents>(
        event: K,
        handler: ServerToClientEvents[K]
    ) => {
        if (!socketRef.current) {
            console.warn(`Cannot subscribe to ${String(event)}: socket not initialized`);
            return;
        }
        console.log(`Subscribing to WebSocket event: ${String(event)}`);
        socketRef.current.on(event, handler as any);
    }, []);

    // Unsubscribe from events
    const off = useCallback(<K extends keyof ServerToClientEvents>(
        event: K,
        handler?: ServerToClientEvents[K]
    ) => {
        if (!socketRef.current) return;
        if (handler) {
            socketRef.current.off(event, handler as any);
        } else {
            socketRef.current.off(event);
        }
        console.log(`Unsubscribed from WebSocket event: ${String(event)}`);
    }, []);

    // Emit events
    const emit = useCallback(<K extends keyof ClientToServerEvents>(
        event: K,
        ...args: Parameters<ClientToServerEvents[K]>
    ) => {
        if (!socketRef.current || !isConnected) {
            console.warn(`Cannot emit ${String(event)}: socket not connected (status: ${status})`);
            return;
        }
        console.log(`Emitting WebSocket event: ${String(event)}`);
        socketRef.current.emit(event, ...args as any);
    }, [isConnected, status]);

    // Join a room
    const joinRoom = useCallback((roomId: string) => {
        emit('room:join', { roomId });
    }, [emit]);

    // Leave a room
    const leaveRoom = useCallback((roomId: string) => {
        emit('room:leave', { roomId });
    }, [emit]);

    // Send a message
    const sendMessage = useCallback((
        conversationId: string,
        content: string
    ): Promise<{ success: boolean; messageId?: string; error?: string }> => {
        return new Promise((resolve) => {
            emit('message:send', { conversationId, content }, (response) => {
                resolve(response);
            });
        });
    }, [emit]);

    // Mark notification as read
    const markNotificationRead = useCallback((notificationId: string) => {
        emit('notification:markRead', { notificationId });
    }, [emit]);

    // Get online users
    const getOnlineUsers = useCallback((): Promise<string[]> => {
        return new Promise((resolve) => {
            emit('presence:get', (users) => {
                resolve(users);
            });
        });
    }, [emit]);

    return {
        status,
        isConnected,
        socket: socketRef.current,
        on,
        off,
        emit,
        joinRoom,
        leaveRoom,
        sendMessage,
        markNotificationRead,
        getOnlineUsers
    };
}
