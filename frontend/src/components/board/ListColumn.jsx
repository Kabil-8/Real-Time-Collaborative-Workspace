import React, { useState } from "react";
import { Plus, X, MoreHorizontal, Trash2 } from "lucide-react";
import CardItem from "./CardItem";
import api from "../../utils/api";

// Column accent colors by index
const COLUMN_COLORS = [
  "#7c3aed", // violet
  "#3b82f6", // blue
  "#10b981", // emerald
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // purple
  "#06b6d4", // cyan
  "#ec4899", // pink
];

/**
 * ListColumn — frosted-glass Kanban column with colored accent border
 */
const ListColumn = ({ list, boardId, onCardAdded, onListDeleted, onCardClick, index = 0 }) => {
  const [showAddCard, setShowAddCard] = useState(false);
  const [cardTitle, setCardTitle]     = useState("");
  const [creating, setCreating]       = useState(false);
  const [showMenu, setShowMenu]       = useState(false);
  const [deleting, setDeleting]       = useState(false);

  const accentColor = list.color || COLUMN_COLORS[index % COLUMN_COLORS.length];
  const cards = list.cardOrder || [];
  const atWip = list.wipLimit && cards.length >= list.wipLimit;

  const handleAddCard = async (e) => {
    e.preventDefault();
    if (!cardTitle.trim()) return;
    setCreating(true);
    try {
      const { data } = await api.post("/cards", {
        title: cardTitle.trim(),
        listId: list._id,
        boardId,
      });
      onCardAdded?.(list._id, data.card);
      setCardTitle("");
      setShowAddCard(false);
    } catch (err) {
      console.error("Failed to create card:", err);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteList = async () => {
    if (!window.confirm(`Archive the list "${list.title}"?`)) return;
    setDeleting(true);
    try {
      await api.delete(`/lists/${list._id}`);
      onListDeleted?.(list._id);
    } catch (err) {
      console.error("Failed to archive list:", err);
      setDeleting(false);
    }
  };

  return (
    <div
      className="flex-shrink-0 w-72 flex flex-col rounded-2xl max-h-full animate-slide-in
        overflow-hidden"
      style={{
        background: "rgba(2, 6, 23, 0.55)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: "1px solid rgba(255,255,255,0.07)",
        boxShadow: "0 8px 40px rgba(0,0,0,0.30), inset 0 1px 0 rgba(255,255,255,0.05)",
      }}
    >
      {/* Top accent bar */}
      <div className="h-0.5 w-full flex-shrink-0" style={{ background: `linear-gradient(90deg, ${accentColor}, ${accentColor}44)` }} />

      {/* Column header */}
      <div className="flex items-center gap-2 px-4 pt-3 pb-3">
        {/* Color dot */}
        <span
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: accentColor, boxShadow: `0 0 6px ${accentColor}88` }}
        />
        <h3 className="flex-1 text-sm font-bold text-white/90 truncate">{list.title}</h3>

        {/* Card count */}
        <span
          className={`min-w-[22px] h-5 px-1.5 rounded-full text-[11px] font-bold
            flex items-center justify-center transition-colors
            ${atWip
              ? "bg-red-500/20 text-red-400"
              : "bg-white/10 text-white/50"
            }`}
        >
          {cards.length}
        </span>

        {/* Column menu */}
        <div className="relative">
          <button
            onClick={() => setShowMenu((o) => !o)}
            className="p-1.5 rounded-lg text-white/30 hover:text-white/70
              hover:bg-white/10 transition-all"
          >
            <MoreHorizontal size={14} />
          </button>
          {showMenu && (
            <>
              <div className="fixed inset-0 z-20" onClick={() => setShowMenu(false)} />
              <div
                className="absolute top-full right-0 mt-1 w-44 rounded-xl overflow-hidden z-30
                  animate-scale-in shadow-2xl shadow-black/60"
                style={{
                  background: "rgba(15,23,42,0.95)",
                  border: "1px solid rgba(148,163,184,0.10)",
                  backdropFilter: "blur(12px)",
                }}
              >
                <button
                  onClick={() => { setShowAddCard(true); setShowMenu(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-slate-300
                    hover:bg-white/5 transition-colors"
                >
                  <Plus size={14} className="text-violet-400" />
                  Add a card
                </button>
                <div className="border-t border-white/5" />
                <button
                  onClick={() => { handleDeleteList(); setShowMenu(false); }}
                  disabled={deleting}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-red-400
                    hover:bg-red-500/10 transition-colors disabled:opacity-50"
                >
                  <Trash2 size={14} />
                  Archive list
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* WIP warning */}
      {atWip && (
        <div className="mx-3 mb-2 px-3 py-1.5 rounded-xl bg-red-500/10 border border-red-500/20
          text-red-400 text-xs flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse-dot" />
          WIP limit reached ({list.wipLimit})
        </div>
      )}

      {/* Cards */}
      <div className="flex-1 overflow-y-auto px-3 py-1 space-y-2 min-h-0">
        {cards.map((card) => (
          <CardItem
            key={card._id}
            card={card}
            onClick={() => onCardClick?.(card)}
          />
        ))}
        {cards.length === 0 && !showAddCard && (
          <div className="py-6 flex flex-col items-center justify-center text-center">
            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center mb-2">
              <Plus size={14} className="text-white/20" />
            </div>
            <p className="text-xs text-white/20">No cards yet</p>
          </div>
        )}
      </div>

      {/* Add card area */}
      <div className="px-3 pb-3 pt-1 flex-shrink-0">
        {showAddCard ? (
          <form onSubmit={handleAddCard} className="space-y-2 animate-scale-in">
            <textarea
              autoFocus
              value={cardTitle}
              onChange={(e) => setCardTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAddCard(e); }
                if (e.key === "Escape") { setShowAddCard(false); setCardTitle(""); }
              }}
              placeholder="Card title…"
              rows={2}
              className="w-full px-3 py-2.5 rounded-xl text-sm text-white placeholder-white/30
                resize-none transition-all outline-none focus:ring-2 focus:ring-violet-500/60"
              style={{
                background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.12)",
              }}
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={creating || !cardTitle.trim()}
                className="flex-1 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600
                  hover:from-violet-500 hover:to-indigo-500 text-white text-xs
                  font-semibold disabled:opacity-50 transition-all"
              >
                {creating ? "Adding…" : "Add card"}
              </button>
              <button
                type="button"
                onClick={() => { setShowAddCard(false); setCardTitle(""); }}
                className="p-2 rounded-xl bg-white/10 text-white/50 hover:text-white transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setShowAddCard(true)}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm
              text-white/30 hover:text-white/70 hover:bg-white/8 transition-all group"
          >
            <Plus size={14} className="transition-transform group-hover:rotate-90 duration-200" />
            Add a card
          </button>
        )}
      </div>
    </div>
  );
};

export default ListColumn;
