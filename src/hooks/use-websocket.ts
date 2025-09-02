import { useEffect, useRef, useState, useCallback } from 'react';
import { Observable } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import {
    ServerToClientEvents,
    ClientToServerEvents
} from '../../types/websocket-events.types';

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

        const initializeSocket = async () => {
            try {
                // Fetch WebSocket auth token
                const tokenResponse = await fetch('/api/auth/websocket-token', {
                    credentials: 'include'
                });

                if (!tokenResponse.ok) {
                    console.error('Failed to get WebSocket auth token');
                    setStatus('error');
                    return;
                }

                const { token } = await tokenResponse.json();

                // Initialize socket connection
                const socket = io(process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'http://localhost:3001', {
                    withCredentials: true,
                    transports: ['websocket', 'polling'],
                    reconnection: true,
                    reconnectionDelay: 1000,
                    reconnectionDelayMax: 5000,
                    reconnectionAttempts: 5,
                    timeout: 20000,
                    forceNew: true,
                    auth: {
                        token: token
                    },
                    extraHeaders: {
                        'Access-Control-Allow-Credentials': 'true'
                    }
                });

                socketRef.current = socket;
                setStatus('connecting');

                // Connection event handlers
                socket.on('connect', () => {
                    setStatus('connected');
                    setIsConnected(true);
                });

                socket.on('disconnect', (reason) => {
                    setStatus('disconnected');
                    setIsConnected(false);
                });

                socket.on('connect_error', (error) => {
                    console.error('WebSocket connection error:', error.message);
                    console.error('Error details:', error);
                    setStatus('error');
                    setIsConnected(false);
                });

                socket.on('reconnect_error', (error) => {
                    console.error('WebSocket reconnection error:', error);
                });

                socket.on('reconnect_failed', () => {
                    console.error('WebSocket reconnection failed after max attempts');
                    setStatus('error');
                });
            } catch (error) {
                console.error('Failed to initialize WebSocket:', error);
                setStatus('error');
            }
        };

        initializeSocket();

        // Cleanup on unmount
        return () => {
            if (socketRef.current) {
                socketRef.current.removeAllListeners();
                socketRef.current.close();
                socketRef.current = null;
            }
            setStatus('disconnected');
            setIsConnected(false);
        };
    }, []);

    // Subscribe to events
    const on = useCallback(<K extends keyof ServerToClientEvents>(
        event: K
    ): Observable<Parameters<ServerToClientEvents[K]>[0]> => {
        return new Observable(subscriber => {
            if (!socketRef.current) {
                subscriber.error(new Error(`Cannot subscribe to ${String(event)}: socket not initialized`));
                return;
            }

            const handler = (data: any) => {
                subscriber.next(data);
            };

            socketRef.current.on(event, handler as any);

            // Cleanup
            return () => {
                if (socketRef.current) {
                    socketRef.current.off(event, handler as any);
                }
            };
        });
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
        socketRef.current.emit(event, ...args as any);
    }, [isConnected, status]);

    return {
        status,
        isConnected,
        socket: socketRef.current,
        on,
        emit
    };
}
