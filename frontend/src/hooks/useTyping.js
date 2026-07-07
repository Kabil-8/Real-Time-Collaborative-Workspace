import { useEffect, useRef, useState, useCallback } from "react";
import { useSocket } from "../context/SocketContext";

const TYPING_STOP_DELAY = 2000; // ms after last keystroke before "stop" fires

/**
 * useTyping — bidirectional typing indicators for a board.
 *
 * emitTyping(context)  — call on every keystroke; auto-sends stop after 2s.
 *                        context = "board" | `card:${cardId}`
 * typingUsers          — Array<{ userId, name, avatarColor, context }>
 *                        filtered to users actively typing (excluding self)
 *
 * boardId is required. currentUserId is used to filter self out of the list.
 */
const useTyping = (boardId, currentUserId) => {
  const { socket } = useSocket();
  const [typingUsers, setTypingUsers] = useState([]);
  const stopTimers = useRef({}); // context → timeout id

  // ── Listen for typing events from other users ──────────────────────────────
  useEffect(() => {
    if (!socket || !boardId) return;

    const handleTyping = ({ user, isTyping, context }) => {
      // Filter out self
      if (user.userId === currentUserId) return;

      setTypingUsers((prev) => {
        const key = `${user.userId}:${context}`;
        const filtered = prev.filter(
          (u) => `${u.userId}:${u.context}` !== key
        );
        if (isTyping) {
          return [...filtered, { ...user, context }];
        }
        return filtered;
      });
    };

    socket.on("user:typing", handleTyping);
    return () => socket.off("user:typing", handleTyping);
  }, [socket, boardId, currentUserId]);

  // ── Emit typing event from this user ──────────────────────────────────────
  const emitTyping = useCallback(
    (context = "board") => {
      if (!socket || !boardId) return;

      const key = context;

      // Send "start" immediately
      socket.emit("typing:start", { boardId, context });

      // Clear existing stop timer for this context
      if (stopTimers.current[key]) {
        clearTimeout(stopTimers.current[key]);
      }

      // Schedule "stop"
      stopTimers.current[key] = setTimeout(() => {
        socket.emit("typing:stop", { boardId, context });
        delete stopTimers.current[key];
      }, TYPING_STOP_DELAY);
    },
    [socket, boardId]
  );

  // Stop all typing on unmount
  useEffect(() => {
    return () => {
      Object.values(stopTimers.current).forEach(clearTimeout);
    };
  }, []);

  return { typingUsers, emitTyping };
};

export default useTyping;
