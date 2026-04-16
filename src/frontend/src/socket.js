import { io } from "socket.io-client";

const BACKEND_URL = import.meta.env.VITE_SOCKET_URL;

// Use autoConnect: false so we only connect when actually needed,
// preventing connection errors on pages that don't use sockets.
export const playerSocket = io(BACKEND_URL, {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  timeout: 10000,
});

export const adminSocket = io(`${BACKEND_URL}/admin`, {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  timeout: 10000,
});