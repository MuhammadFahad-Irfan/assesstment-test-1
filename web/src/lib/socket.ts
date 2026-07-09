import { io, Socket } from 'socket.io-client';

const baseURL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

/**
 * Create an authenticated Socket.IO connection. The backend verifies the JWT
 * and workspace membership on the handshake, then joins us to the workspace
 * room where `budget:updated` events are broadcast.
 */
export function createSocket(token: string, workspaceId: string): Socket {
  return io(baseURL, {
    auth: { token, workspaceId },
    transports: ['websocket'],
    autoConnect: true,
  });
}
