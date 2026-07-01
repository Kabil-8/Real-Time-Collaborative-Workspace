/**
 * hooks/useSocket.js
 * ─────────────────────────────────────────────────────────────────
 * Reusable React hook that:
 *   1. Creates a single authenticated Socket.io connection
 *   2. Joins a board room on mount  (emit "join_board")
 *   3. Leaves the room and disconnects on unmount
 *
 * Usage:
 *   const socket = useSocket(boardId);
 *   // Then attach listeners on `socket` inside useEffect:
 *   useEffect(() => {
 *     if (!socket) return;
 *     socket.on("card:updated", handler);
 *     return () => socket.off("card:updated", handler);
 *   }, [socket]);
 *
 * Design decisions:
 *   - Token is read from localStorage key "token" (same as the Axios
 *     interceptor in api.js).  If absent the hook still creates the
 *     socket; the server's authMiddleware will disconnect it.
 *   - We pass `transports: ["websocket"]` to skip the polling upgrade
 *     phase — quicker connection in a local-dev environment.
 *   - The socket is created once per mount (ref-guarded) so hot-reloads
 *     do not multiply connections.
 */

import { useEffect, useRef } from "react";
import { io } from "socket.io-client";

// The backend URL.  In CRA-style apps this is the same origin; Vite
// proxies /api so we need the explicit port for the WS connection.
const SOCKET_URL =
  process.env.REACT_APP_SOCKET_URL ||
  "http://localhost:5000";

/**
 * @param {string | null | undefined} boardId
 * @returns {import("socket.io-client").Socket | null}
 */
const useSocket = (boardId) => {
  const socketRef = useRef(null);

  useEffect(() => {
    if (!boardId) return;

    const token = localStorage.getItem("token");

    // Create the socket only once
    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ["websocket"],
      // Reconnect automatically (default behaviour)
    });

    socketRef.current = socket;

    // ── Join the board room ──────────────────────────────────────
    socket.on("connect", () => {
      console.log(`[Socket] ✅ Connected | sid=${socket.id}`);
      socket.emit("join_board", { boardId });
    });

    socket.on("connect_error", (err) => {
      console.warn("[Socket] ⚠️  Connection error:", err.message);
    });

    socket.on("disconnect", (reason) => {
      console.log("[Socket] 🔌 Disconnected:", reason);
    });

    // ── Cleanup on unmount / boardId change ──────────────────────
    return () => {
      socket.emit("leave_board", { boardId });
      socket.disconnect();
      socketRef.current = null;
      console.log(`[Socket] 🚪 Left board room board:${boardId}`);
    };
  }, [boardId]);

  return socketRef.current;
};

export default useSocket;
