import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Plus, X, ArrowLeft, Star, Loader2, Users, List, MoreHorizontal
} from "lucide-react";
import api from "../utils/api";
import ListColumn from "../components/board/ListColumn";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

// ─── Add-list form ────────────────────────────────────────────────────────────
const AddListForm = ({ boardId, onListAdded }) => {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);
    try {
      const { data } = await api.post("/lists", { title: title.trim(), boardId });
      onListAdded(data.list);
      setTitle("");
      setOpen(false);
    } catch (err) {
      console.error("Failed to create list:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex-shrink-0 w-72 h-12 flex items-center gap-2.5 px-4 rounded-2xl
          bg-white/5 hover:bg-white/10 border border-dashed border-white/20
          hover:border-white/30 text-white/50 hover:text-white/80
          transition-all duration-200 text-sm font-medium group backdrop-blur-sm"
      >
        <Plus size={16} className="transition-transform group-hover:rotate-90 duration-200" />
        Add another list
      </button>
    );
  }

  return (
    <div className="flex-shrink-0 w-72 glass-dark rounded-2xl p-3 animate-scale-in">
      <form onSubmit={handleSubmit} className="space-y-2">
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
          placeholder="List name…"
          className="input-field text-sm"
        />
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading || !title.trim()}
            className="flex-1 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600
              hover:from-violet-500 hover:to-indigo-500 text-white text-xs
              font-semibold disabled:opacity-50 transition-all"
          >
            {loading ? "Adding…" : "Add list"}
          </button>
          <button
            type="button"
            onClick={() => { setOpen(false); setTitle(""); }}
            className="p-2 rounded-xl bg-white/10 text-white/60 hover:text-white transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      </form>
    </div>
  );
};

// ─── Board header ─────────────────────────────────────────────────────────────
const BoardHeader = ({ board, onBack, listCount }) => {
  const { isDark } = useTheme();
  const [starred, setStarred] = useState(board?.isStarred || false);

  const toggleStar = async () => {
    try {
      await api.patch(`/boards/${board._id}`, { isStarred: !starred });
      setStarred((s) => !s);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div
      className="flex items-center gap-3 px-5 py-3 flex-shrink-0"
      style={{
        borderBottom: isDark ? "1px solid rgba(255,255,255,0.10)" : "1px solid rgba(0,0,0,0.08)",
        background: isDark ? "rgba(0,0,0,0.20)" : "rgba(255,255,255,0.85)",
        backdropFilter: "blur(16px)",
      }}
    >
      <button
        onClick={onBack}
        className="p-1.5 rounded-xl transition-all"
        style={{
          background: isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.06)",
          color: isDark ? "rgba(255,255,255,0.70)" : "#374151",
        }}
        title="Back to home"
      >
        <ArrowLeft size={16} />
      </button>
      <span className="w-px h-5" style={{ background: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.10)" }} />
      <h1 className="text-sm font-bold flex-1 truncate" style={{ color: isDark ? "#fff" : "#111827" }}>{board?.title || "Board"}</h1>
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
        style={{ background: isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.06)", color: isDark ? "rgba(255,255,255,0.70)" : "#6b7280" }}>
        <List size={11} />
        {listCount} lists
      </div>
      {board?.members?.length > 0 && (
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
          style={{ background: isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.06)", color: isDark ? "rgba(255,255,255,0.70)" : "#6b7280" }}>
          <Users size={11} />
          {board.members.length}
        </div>
      )}
      <button
        onClick={toggleStar}
        className="p-1.5 rounded-xl transition-all"
        style={{
          background: starred
            ? "rgba(234,179,8,0.20)"
            : isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.06)",
          color: starred ? "#fde047" : isDark ? "rgba(255,255,255,0.50)" : "#9ca3af",
        }}
        title={starred ? "Unstar board" : "Star board"}
      >
        <Star size={15} className={starred ? "fill-yellow-300" : ""} />
      </button>
    </div>
  );
};

// ─── Main Board Page ──────────────────────────────────────────────────────────
const BoardPage = () => {
  const { boardId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isDark } = useTheme();

  const [board, setBoard] = useState(null);
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadBoard = useCallback(async () => {
    if (!boardId) return;
    setLoading(true);
    setError("");
    try {
      const [boardRes, listRes] = await Promise.all([
        api.get(`/boards/${boardId}`),
        api.get(`/lists/board/${boardId}`),
      ]);
      setBoard(boardRes.data.board);
      setLists(listRes.data.lists || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load board.");
    } finally {
      setLoading(false);
    }
  }, [boardId]);

  useEffect(() => { loadBoard(); }, [loadBoard]);

  const handleListAdded   = (newList) =>
    setLists((prev) => [...prev, { ...newList, cardOrder: [] }]);
  const handleListDeleted = (listId) =>
    setLists((prev) => prev.filter((l) => l._id !== listId));
  const handleCardAdded   = (listId, newCard) =>
    setLists((prev) =>
      prev.map((l) =>
        l._id === listId
          ? { ...l, cardOrder: [...(l.cardOrder || []), newCard] }
          : l
      )
    );

  // Loading
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-950 h-full">
        <div className="flex flex-col items-center gap-4">
          <div className="spinner-gradient" />
          <p className="text-slate-500 text-sm">Loading board…</p>
        </div>
      </div>
    );
  }

  // Error
  if (error || !board) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center py-20 animate-fade-in">
        <div className="w-16 h-16 rounded-2xl glass flex items-center justify-center text-3xl mb-4">
          🗂️
        </div>
        <h3 className="text-lg font-bold text-white mb-2">Board not found</h3>
        <p className="text-slate-500 text-sm mb-6">{error || "This board doesn't exist or you don't have access."}</p>
        <button
          onClick={() => navigate("/")}
          className="btn-primary"
        >
          Back to home
        </button>
      </div>
    );
  }

  const bg = board.background?.value || "linear-gradient(135deg, #667eea 0%, #764ba2 100%)";
  // In light mode: soften the board background with a light overlay
  const boardBg = isDark
    ? bg
    : "linear-gradient(135deg, #e0e7ff 0%, #f3e8ff 50%, #e0f2fe 100%)";

  return (
    <div className="flex flex-col h-full relative" style={{ background: boardBg }}>
      {/* Overlay — lighter in light mode */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
          background: isDark
            ? "linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.15) 40%, rgba(0,0,0,0.40) 100%)"
            : "linear-gradient(to bottom, rgba(255,255,255,0.20) 0%, rgba(255,255,255,0.05) 100%)"
        }}
      />
      {/* Noise texture */}
      <div className="absolute inset-0 pointer-events-none opacity-30"
        style={{
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.1'/%3E%3C/svg%3E\")"
        }}
      />

      <div className="relative flex flex-col h-full">
        {/* Board header */}
        <BoardHeader board={board} onBack={() => navigate("/")} listCount={lists.length} />

        {/* Kanban columns */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden">
          <div className="flex gap-4 p-6 h-full items-start min-w-max">
            {lists.map((list) => (
              <ListColumn
                key={list._id}
                list={list}
                boardId={boardId}
                onCardAdded={handleCardAdded}
                onListDeleted={handleListDeleted}
                onCardClick={(card) => console.log("Card clicked:", card.title)}
              />
            ))}
            <AddListForm boardId={boardId} onListAdded={handleListAdded} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default BoardPage;
