import { useEffect, useRef, useState } from "react";
import { useSocket } from "../context/SocketContext";

/**
 * usePresence — tracks which users are currently viewing a specific board.
 *
 * - Emits `join_board` when the hook mounts / boardId changes.
 * - Emits `leave_board` when the hook unmounts or boardId changes.
 * - Listens for `presence:update` events from the server.
 *
 * Returns:
 *   activeUsers: Array<{ userId, name, avatarColor, avatar }>
 */
const usePresence = (boardId) => {
  const { socket } = useSocket();
  const [activeUsers, setActiveUsers] = useState([]);
  const prevBoardId = useRef(null);

  useEffect(() => {
    if (!socket || !boardId) return;

    // Leave the previous board room if boardId changed
    if (prevBoardId.current && prevBoardId.current !== boardId) {
      socket.emit("leave_board", { boardId: prevBoardId.current });
    }

    // Join the new board room
    socket.emit("join_board", { boardId });
    prevBoardId.current = boardId;

    // Listen for presence updates
    const handlePresence = (payload) => {
      if (payload.boardId === boardId) {
        setActiveUsers(payload.users || []);
      }
    };

    socket.on("presence:update", handlePresence);

    return () => {
      socket.off("presence:update", handlePresence);
      socket.emit("leave_board", { boardId });
      prevBoardId.current = null;
      setActiveUsers([]);
    };
  }, [socket, boardId]);

  return { activeUsers };
};

export default usePresence;
