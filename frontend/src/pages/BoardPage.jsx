import React, { useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Star, Wifi, WifiOff } from "lucide-react";
import useBoardStore from "../context/BoardContext";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useSocket } from "../context/SocketContext";
import usePresence from "../hooks/usePresence";
import useTyping from "../hooks/useTyping";
import KanbanBoard from "../components/board/KanbanBoard";
import PresenceAvatars from "../components/board/PresenceAvatars";
import TypingIndicator from "../components/board/TypingIndicator";
import api from "../utils/api";

// ─── Board top bar ────────────────────────────────────────────────────────────
const BoardTopBar = ({ board, onStar, onBack, activeUsers, currentUser, connected }) => {
  const { toggleTheme, isDark } = useTheme();

  return (
    <div className="board-topbar">
      {/* Back */}
      <button className="btn-icon" onClick={onBack} title="Back to home">
        <ArrowLeft size={16} />
      </button>

      {/* Separator */}
      <div style={{ width: 1, height: 20, background: "rgba(255,255,255,.15)", flexShrink: 0 }} />

      {/* Board name */}
      <h1
        style={{
          fontSize: 15,
          fontWeight: 700,
          color: "#fff",
          margin: 0,
          flexShrink: 0,
          textShadow: "0 1px 3px rgba(0,0,0,.4)",
        }}
      >
        {board?.title}
      </h1>

      {/* Star */}
      <button
        className="btn-icon"
        onClick={onStar}
        title={board?.isStarred ? "Unstar board" : "Star board"}
        style={{ color: board?.isStarred ? "#fbbf24" : "rgba(255,255,255,.6)" }}
      >
        <Star size={15} fill={board?.isStarred ? "#fbbf24" : "none"} />
      </button>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Live presence avatars */}
      <PresenceAvatars users={activeUsers} currentUser={currentUser} max={4} />

      {/* Connection status dot */}
      <div
        title={connected ? "Real-time connected" : "Reconnecting…"}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 5,
          padding: "4px 10px",
          borderRadius: "var(--radius-full)",
          background: "rgba(255,255,255,.1)",
          border: "1px solid rgba(255,255,255,.15)",
          fontSize: 11,
          color: connected ? "#4ade80" : "#fbbf24",
          flexShrink: 0,
        }}
      >
        {connected ? <Wifi size={11} /> : <WifiOff size={11} />}
        <span style={{ fontWeight: 600 }}>{connected ? "Live" : "…"}</span>
      </div>

      {/* Theme toggle */}
      <button
        className="theme-toggle"
        onClick={toggleTheme}
        title={isDark ? "Switch to light mode" : "Switch to dark mode"}
        style={{ background: "rgba(255,255,255,.12)", border: "1px solid rgba(255,255,255,.18)", color: "rgba(255,255,255,.8)" }}
      >
        {isDark ? "☀️" : "🌙"}
      </button>
    </div>
  );
};

// ─── Loading skeleton ─────────────────────────────────────────────────────────
const BoardSkeleton = () => (
  <div className="kanban-board">
    {[1, 2, 3].map((i) => (
      <div key={i} style={{ width: 296, flexShrink: 0 }}>
        <div style={{
          background: "var(--kanban-list-bg)",
          border: "1px solid var(--kanban-list-border)",
          borderRadius: "var(--radius-lg)",
          padding: 14,
          backdropFilter: "blur(12px)",
        }}>
          <div className="skeleton" style={{ height: 18, width: "60%", marginBottom: 16, borderRadius: 4 }} />
          {[1, 2, 3].map((j) => (
            <div key={j} className="skeleton" style={{ height: 72, marginBottom: 8, borderRadius: "var(--radius-md)" }} />
          ))}
        </div>
      </div>
    ))}
  </div>
);

// ─── BoardPage ────────────────────────────────────────────────────────────────
const BoardPage = () => {
  const { boardId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { board, lists, isLoading, error, fetchBoard, reset, applyServerUpdate } = useBoardStore();
  const { socket, connected } = useSocket();

  // ── Presence & Typing ──────────────────────────────────────────────────────
  const { activeUsers } = usePresence(boardId);
  const { typingUsers, emitTyping } = useTyping(boardId, user?._id);

  // Board-level typing (typing a new card title or list title)
  const boardTypingUsers = typingUsers.filter((u) => u.context === "board");

  // ── Fetch board on mount ───────────────────────────────────────────────────
  useEffect(() => {
    if (boardId) fetchBoard(boardId);
    return () => reset();
  }, [boardId]);

  // ── Subscribe to all real-time board events ────────────────────────────────
  useEffect(() => {
    if (!socket || !boardId) return;

    const BOARD_EVENTS = [
      "card:created",
      "card:updated",
      "card:moved",
      "card:archived",
      "cards:reordered",
      "card:comment_added",
      "card:comment_deleted",
      "list:created",
      "list:updated",
      "list:archived",
      "list:deleted",
      "lists:reordered",
    ];

    const handlers = {};

    BOARD_EVENTS.forEach((event) => {
      const handler = (payload) => {
        applyServerUpdate(event, payload);
      };
      handlers[event] = handler;
      socket.on(event, handler);
    });

    return () => {
      BOARD_EVENTS.forEach((event) => {
        socket.off(event, handlers[event]);
      });
    };
  }, [socket, boardId, applyServerUpdate]);

  // ── Star handler ───────────────────────────────────────────────────────────
  const handleStar = useCallback(async () => {
    if (!board) return;
    try {
      await api.patch(`/boards/${boardId}`, { isStarred: !board.isStarred });
      await fetchBoard(boardId);
    } catch (err) {
      console.error("Failed to star board", err);
    }
  }, [board, boardId, fetchBoard]);

  if (error) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 12 }}>
        <p style={{ fontSize: 16, color: "var(--accent-rose)" }}>⚠ {error}</p>
        <button className="btn btn-ghost" onClick={() => navigate("/")}>
          <ArrowLeft size={14} /> Go home
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Top bar */}
      <BoardTopBar
        board={board}
        onStar={handleStar}
        onBack={() => navigate("/")}
        activeUsers={activeUsers}
        currentUser={user}
        connected={connected}
      />

      {/* Typing indicator bar — board-level */}
      {boardTypingUsers.length > 0 && (
        <div style={{
          background: "rgba(0,0,0,.35)",
          backdropFilter: "blur(8px)",
          borderBottom: "1px solid rgba(255,255,255,.06)",
          padding: "6px 16px",
        }}>
          <TypingIndicator users={boardTypingUsers} />
        </div>
      )}

      {/* Board canvas */}
      <div style={{ flex: 1, overflow: "hidden", minHeight: 0 }}>
        {isLoading ? (
          <BoardSkeleton />
        ) : (
          <KanbanBoard
            boardId={boardId}
            board={board}
            currentUser={user}
            typingUsers={typingUsers}
            emitTyping={emitTyping}
          />
        )}
      </div>
    </div>
  );
};

export default BoardPage;
