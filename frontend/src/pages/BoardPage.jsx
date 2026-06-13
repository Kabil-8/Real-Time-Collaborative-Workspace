import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Plus, X, ArrowLeft, Star, Settings2, Loader2, Users } from "lucide-react";
import api from "../utils/api";
import ListColumn from "../components/board/ListColumn";
import { useAuth } from "../context/AuthContext";

// ─── Add-list form (inline at the end of the board) ──────────────────────────
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
          bg-slate-800/40 hover:bg-slate-800/70 border border-dashed border-slate-700
          hover:border-slate-600 text-slate-500 hover:text-slate-300 transition-all text-sm font-medium"
      >
        <Plus size={16} />
        Add another list
      </button>
    );
  }

  return (
    <div className="flex-shrink-0 w-72 bg-slate-900/70 border border-slate-800/60 rounded-2xl p-3 animate-scale-in">
      <form onSubmit={handleSubmit} className="space-y-2">
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
          placeholder="List name…"
          className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white
            text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
        />
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading || !title.trim()}
            className="flex-1 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs
              font-semibold disabled:opacity-50 transition-colors"
          >
            {loading ? "Adding…" : "Add list"}
          </button>
          <button
            type="button"
            onClick={() => { setOpen(false); setTitle(""); }}
            className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      </form>
    </div>
  );
};

// ─── Board header ─────────────────────────────────────────────────────────────
const BoardHeader = ({ board, onBack }) => {
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
    <div className="flex items-center gap-3 px-6 py-3 border-b border-black/20 backdrop-blur-sm bg-black/10 flex-shrink-0">
      <button
        onClick={onBack}
        className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-all"
        title="Back to home"
      >
        <ArrowLeft size={16} />
      </button>

      <h1 className="text-base font-bold text-white flex-1 truncate">
        {board?.title || "Board"}
      </h1>

      <button
        onClick={toggleStar}
        className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-all"
        title={starred ? "Unstar board" : "Star board"}
      >
        <Star size={16} className={starred ? "fill-yellow-300 text-yellow-300" : ""} />
      </button>

      {/* Member count pill */}
      {board?.members?.length > 0 && (
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 text-white/80 text-xs font-medium">
          <Users size={12} />
          {board.members.length}
        </div>
      )}
    </div>
  );
};

// ─── Main Board Page ──────────────────────────────────────────────────────────
const BoardPage = () => {
  const { boardId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [board, setBoard] = useState(null);
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Fetch board details + lists
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

  useEffect(() => {
    loadBoard();
  }, [loadBoard]);

  // Called by AddListForm when a list is created
  const handleListAdded = (newList) => {
    setLists((prev) => [...prev, { ...newList, cardOrder: [] }]);
  };

  // Called by ListColumn when a list is archived
  const handleListDeleted = (listId) => {
    setLists((prev) => prev.filter((l) => l._id !== listId));
  };

  // Called by ListColumn when a card is added
  const handleCardAdded = (listId, newCard) => {
    setLists((prev) =>
      prev.map((l) =>
        l._id === listId
          ? { ...l, cardOrder: [...(l.cardOrder || []), newCard] }
          : l
      )
    );
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} className="text-violet-400 animate-spin" />
          <p className="text-slate-500 text-sm">Loading board…</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !board) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center py-20 animate-fade-in">
        <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center text-3xl mb-4">🗂️</div>
        <h3 className="text-lg font-semibold text-white mb-2">Board not found</h3>
        <p className="text-slate-500 text-sm mb-6">{error || "This board doesn't exist or you don't have access."}</p>
        <button
          onClick={() => navigate("/")}
          className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-all"
        >
          Back to home
        </button>
      </div>
    );
  }

  const bg = board.background?.value || "linear-gradient(135deg, #667eea 0%, #764ba2 100%)";

  return (
    <div className="flex flex-col h-full" style={{ background: bg }}>
      {/* Subtle dark overlay to keep text readable */}
      <div className="absolute inset-0 bg-black/30 pointer-events-none" />

      <div className="relative flex flex-col h-full">
        {/* Board header */}
        <BoardHeader board={board} onBack={() => navigate("/")} />

        {/* Kanban columns — horizontal scroll */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden">
          <div className="flex gap-4 p-6 h-full items-start">
            {lists.map((list) => (
              <ListColumn
                key={list._id}
                list={list}
                boardId={boardId}
                onCardAdded={handleCardAdded}
                onListDeleted={handleListDeleted}
                onCardClick={(card) => {
                  // Future: open card detail modal
                  console.log("Card clicked:", card.title);
                }}
              />
            ))}

            {/* Add list form */}
            <AddListForm boardId={boardId} onListAdded={handleListAdded} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default BoardPage;
