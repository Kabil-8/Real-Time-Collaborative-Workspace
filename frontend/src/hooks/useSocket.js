/**
 * hooks/useSocket.js
 * ─────────────────────────────────────────────────────────────────
 * Reusable React hook that:
 *   1. Creates a single authenticated Socket.io connection
 *   2. Joins a board room on mount  (emit "join_board")
 *   3. Leaves the room and disconnects on unmount
 *   4. Exposes `socket.id` so the Axios interceptor can tag every
 *      HTTP request with `x-socket-id`, enabling the backend to
 *      skip echoing events back to the originating client.
 *
 * Usage:
 *   const { socket, socketId } = useSocket(boardId);
 *   useEffect(() => {
 *     if (!socket) return;
 *     socket.on("card:updated", handler);
 *     return () => socket.off("card:updated", handler);
 *   }, [socket]);
 *
 * Design decisions:
 *   - Token is read from localStorage key "token" (same as the Axios
 *     interceptor in api.js). If absent, the server's authMiddleware
 *     will disconnect the socket.
 *   - We pass `transports: ["websocket"]` to skip the polling upgrade
 *     phase — quicker in local-dev.
 *   - The socket is created once per mount (ref-guarded) so hot-reloads
 *     do not multiply connections.
 *   - `socketIdRef` is written synchronously on "connect" so any code
 *     that reads it after the first render cycle gets the real id.
 */

import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

// The backend WebSocket URL. In CRA-style apps the WS connection needs
// the explicit port (Vite proxies /api but not WebSockets).
const SOCKET_URL =
  process.env.REACT_APP_SOCKET_URL ||
  "http://localhost:5000";

/**
 * @param {string | null | undefined} boardId
 * @returns {{ socket: import("socket.io-client").Socket | null, socketId: string | null }}
 */
const useSocket = (boardId) => {
  const socketRef   = useRef(null);
  const [socketId, setSocketId] = useState(null);

  useEffect(() => {
    if (!boardId) return;

    const token = localStorage.getItem("zaalima_token");

    // Create the socket only once per boardId
    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ["websocket"],
      // Reconnect automatically (default behaviour)
    });

    socketRef.current = socket;

    // ── Join the board room ──────────────────────────────────────
    socket.on("connect", () => {
      console.log(`[Socket] ✅ Connected | sid=${socket.id}`);
      setSocketId(socket.id);
      socket.emit("join_board", { boardId });
    });

    // After a reconnect the socket gets a new sid — keep state in sync
    socket.on("reconnect", () => {
      setSocketId(socket.id);
      socket.emit("join_board", { boardId });
    });

    socket.on("connect_error", (err) => {
      console.warn("[Socket] ⚠️  Connection error:", err.message);
    });

    socket.on("disconnect", (reason) => {
      console.log("[Socket] 🔌 Disconnected:", reason);
      setSocketId(null);
    });

    // ── Cleanup on unmount / boardId change ──────────────────────
    return () => {
      socket.emit("leave_board", { boardId });
      socket.disconnect();
      socketRef.current = null;
      setSocketId(null);
      console.log(`[Socket] 🚪 Left board room board:${boardId}`);
    };
  }, [boardId]);

  return { socket: socketRef.current, socketId };
};

export default useSocket;
