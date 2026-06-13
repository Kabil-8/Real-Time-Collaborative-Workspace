import React, { useState } from "react";
import { Plus, X, MoreHorizontal, Trash2, GripVertical } from "lucide-react";
import CardItem from "./CardItem";
import api from "../../utils/api";

/**
 * ListColumn — renders a Kanban list column with its cards and an add-card form.
 * Props: list, boardId, onCardAdded, onListDeleted, onCardClick
 */
const ListColumn = ({ list, boardId, onCardAdded, onListDeleted, onCardClick }) => {
  const [showAddCard, setShowAddCard] = useState(false);
  const [cardTitle, setCardTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [deleting, setDeleting] = useState(false);

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

  const cards = list.cardOrder || [];

  return (
    <div className="flex-shrink-0 w-72 flex flex-col bg-slate-900/70 border border-slate-800/60
      rounded-2xl max-h-full animate-slide-in">
      {/* Column header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-800/60">
        {/* Color dot */}
        {list.color && (
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: list.color }} />
        )}
        <h3 className="flex-1 text-sm font-semibold text-slate-200 truncate">{list.title}</h3>
        <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">
          {cards.length}
        </span>

        {/* Column menu */}
        <div className="relative">
          <button
            onClick={() => setShowMenu((o) => !o)}
            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-300 hover:bg-slate-800 transition-colors"
          >
            <MoreHorizontal size={14} />
          </button>
          {showMenu && (
            <div className="absolute top-full right-0 mt-1 w-40 bg-slate-900 border border-slate-700
              rounded-xl shadow-2xl shadow-black/40 z-30 overflow-hidden animate-scale-in">
              <button
                onClick={() => { setShowAddCard(true); setShowMenu(false); }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-slate-300
                  hover:bg-slate-800 transition-colors"
              >
                <Plus size={14} />
                Add a card
              </button>
              <hr className="border-slate-800" />
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
          )}
        </div>
      </div>

      {/* WIP limit warning */}
      {list.wipLimit && cards.length >= list.wipLimit && (
        <div className="mx-3 mt-2 px-3 py-1.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs">
          ⚠ WIP limit reached ({list.wipLimit})
        </div>
      )}

      {/* Cards */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2 min-h-0">
        {cards.map((card) => (
          <CardItem
            key={card._id}
            card={card}
            onClick={() => onCardClick?.(card)}
          />
        ))}
      </div>

      {/* Add card form / button */}
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
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white
                text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500
                resize-none transition-all"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={creating || !cardTitle.trim()}
                className="flex-1 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs
                  font-semibold disabled:opacity-50 transition-colors"
              >
                {creating ? "Adding…" : "Add card"}
              </button>
              <button
                type="button"
                onClick={() => { setShowAddCard(false); setCardTitle(""); }}
                className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setShowAddCard(true)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-slate-500
              hover:text-slate-300 hover:bg-slate-800/70 transition-all text-sm"
          >
            <Plus size={15} />
            Add a card
          </button>
        )}
      </div>
    </div>
  );
};

export default ListColumn;
