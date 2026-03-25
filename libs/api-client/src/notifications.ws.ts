import { io, type Socket } from 'socket.io-client';
import type { IncomingNotification } from './types';

const API_URL =
  typeof window !== 'undefined'
    ? ((window as unknown as Record<string, Record<string, string>>).__ENV__
        ?.VITE_API_URL ?? 'http://localhost:3000')
    : 'http://localhost:3000';

export function connectNotificationSocket(
  token: string,
  onNotification: (notification: IncomingNotification) => void,
): Socket {
  const socket = io(`${API_URL}/notifications`, {
    query: { token },
    transports: ['websocket'],
  });

  socket.on('notification', onNotification);

  return socket;
}
