import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import {
    ServerToClientEvents,
    ClientToServerEvents
} from '@/websocket/types/websocket-events.types';

type WebSocketStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export function useWebSocket() {
    const [status, setStatus] = useState<WebSocketStatus>('disconnected');
    const [isConnected, setIsConnected] = useState(false);
    const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);

    useEffect(() => {
        // Initialize socket connection
        const socket = io({
            withCredentials: true,
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
        });

        socketRef.current = socket;

        // Connection event handlers
        socket.on('connect', () => {
            console.log('WebSocket connected');
            setStatus('connected');
            setIsConnected(true);
        });

        socket.on('disconnect', () => {
            console.log('WebSocket disconnected');
            setStatus('disconnected');
            setIsConnected(false);
        });

        socket.on('connect_error', (error) => {
            console.error('WebSocket connection error:', error);
            setStatus('error');
            setIsConnected(false);
        });

        socket.on('connection:success', (data) => {
            console.log('WebSocket authenticated:', data);
        });

        // Cleanup on unmount
        return () => {
            socket.removeAllListeners();
            socket.close();
            socketRef.current = null;
        };
    }, []);

    // Subscribe to events
    const on = useCallback(<K extends keyof ServerToClientEvents>(
        event: K,
        handler: ServerToClientEvents[K]
    ) => {
        if (!socketRef.current) return;
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
    }, []);

    // Emit events
    const emit = useCallback(<K extends keyof ClientToServerEvents>(
        event: K,
        ...args: Parameters<ClientToServerEvents[K]>
    ) => {
        if (!socketRef.current || !isConnected) {
            console.warn('Cannot emit event: socket not connected');
            return;
        }
        socketRef.current.emit(event, ...args as any);
    }, [isConnected]);

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