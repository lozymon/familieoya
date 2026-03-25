import { io, type Socket } from 'socket.io-client';
import type { IncomingNotification } from './types';

export function connectNotificationSocket(
  token: string,
  onNotification: (notification: IncomingNotification) => void,
): Socket {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const socket = io(`${origin}/notifications`, {
    query: { token },
    transports: ['websocket'],
    path: '/socket.io',
  });

  socket.on('notification', onNotification);

  return socket;
}
