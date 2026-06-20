import React, { useState, useRef } from "react";
import { Plus, X, MoreHorizontal, Trash2, Copy, Edit3, Gauge, GripVertical } from "lucide-react";
import { Droppable } from "@hello-pangea/dnd";
import CardItem from "./CardItem";
import { useTheme } from "../../context/ThemeContext";
import { archiveList, updateList, duplicateList } from "../../utils/listsApi";
import { createCard } from "../../utils/cardsApi";

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
 * ListColumn — frosted-glass Kanban column with full CRUD via REST APIs.
 * Now DnD-aware:
 *  - The column header exposes a drag handle (GripVertical icon) wired to dragHandleProps.
 *  - The card body area is wrapped in a <Droppable> so cards can be dropped in.
 *  - Each card is rendered via <CardItem> which is now a <Draggable>.
 */
const ListColumn = ({
  list,
  boardId,
  onCardAdded,
  onListDeleted,
  onListUpdated,
  onListDuplicated,
  onCardClick,
  index = 0,
  dragHandleProps = {},   // from <Draggable> in BoardPage
  isDraggingList = false, // visual cue while the whole list is being dragged
}) => {
  const { isDark } = useTheme();
  const [showAddCard, setShowAddCard] = useState(false);
  const [cardTitle,   setCardTitle]   = useState("");
  const [creating,    setCreating]    = useState(false);
  const [showMenu,    setShowMenu]    = useState(false);
  const [deleting,    setDeleting]    = useState(false);
  const [duplicating, setDuplicating] = useState(false);

  // Rename state
  const [renaming,    setRenaming]    = useState(false);
  const [renameVal,   setRenameVal]   = useState(list.title);
  const renameRef = useRef(null);

  // WIP limit state
  const [editWip,  setEditWip]  = useState(false);
  const [wipVal,   setWipVal]   = useState(list.wipLimit ?? "");

  const accentColor = list.color || COLUMN_COLORS[index % COLUMN_COLORS.length];
  const cards = list.cardOrder || [];
  const atWip = list.wipLimit && cards.length >= list.wipLimit;

  /* ── Add Card ── */
  const handleAddCard = async (e) => {
    e.preventDefault();
    if (!cardTitle.trim()) return;
    setCreating(true);
    try {
      const card = await createCard({
        title: cardTitle.trim(),
        listId: list._id,
        boardId,
      });
      onCardAdded?.(list._id, card);
      setCardTitle("");
      setShowAddCard(false);
    } catch (err) {
      console.error("Failed to create card:", err);
    } finally {
      setCreating(false);
    }
  };

  /* ── Archive List ── */
  const handleDeleteList = async () => {
    if (!window.confirm(`Archive the list "${list.title}" and all its cards?`)) return;
    setDeleting(true);
    try {
      await archiveList(list._id);
      onListDeleted?.(list._id);
    } catch (err) {
      console.error("Failed to archive list:", err);
      setDeleting(false);
    }
  };

  /* ── Rename List ── */
  const startRename = () => {
    setRenameVal(list.title);
    setRenaming(true);
    setShowMenu(false);
    setTimeout(() => renameRef.current?.focus(), 0);
  };

  const saveRename = async () => {
    const trimmed = renameVal.trim();
    if (!trimmed || trimmed === list.title) {
      setRenaming(false);
      return;
    }
    try {
      const updated = await updateList(list._id, { title: trimmed });
      onListUpdated?.(updated);
    } catch (err) {
      console.error("Failed to rename list:", err);
    } finally {
      setRenaming(false);
    }
  };

  /* ── WIP Limit ── */
  const saveWip = async () => {
    const parsed = wipVal === "" ? null : parseInt(wipVal, 10);
    if (wipVal !== "" && (isNaN(parsed) || parsed < 1)) {
      setEditWip(false);
      setWipVal(list.wipLimit ?? "");
      return;
    }
    try {
      const updated = await updateList(list._id, { wipLimit: parsed });
      onListUpdated?.(updated);
    } catch (err) {
      console.error("Failed to set WIP limit:", err);
    } finally {
      setEditWip(false);
    }
  };

  /* ── Duplicate List ── */
  const handleDuplicate = async () => {
    setShowMenu(false);
    setDuplicating(true);
    try {
      const newList = await duplicateList(list._id);
      onListDuplicated?.(newList);
    } catch (err) {
      console.error("Failed to duplicate list:", err);
    } finally {
      setDuplicating(false);
    }
  };

  /* ── Styles ── */
  const colBg       = isDark ? "rgba(2, 6, 23, 0.55)"   : "rgba(255, 255, 255, 0.88)";
  const colBorder   = isDark ? "rgba(255,255,255,0.07)"  : "rgba(0,0,0,0.07)";
  const colShadow   = isDraggingList
    ? (isDark
        ? "0 20px 60px rgba(0,0,0,0.55), 0 0 0 2px rgba(124,58,237,0.45), inset 0 1px 0 rgba(255,255,255,0.08)"
        : "0 20px 50px rgba(0,0,0,0.16), 0 0 0 2px rgba(124,58,237,0.30)")
    : isDark
      ? "0 8px 40px rgba(0,0,0,0.30), inset 0 1px 0 rgba(255,255,255,0.05)"
      : "0 4px 20px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.05)";
  const headerTxt   = isDark ? "rgba(255,255,255,0.90)"  : "#111827";
  const subTxt      = isDark ? "rgba(255,255,255,0.40)"  : "#9ca3af";
  const menuBg      = isDark ? "rgba(15,23,42,0.95)"     : "#ffffff";
  const menuBorder  = isDark ? "rgba(148,163,184,0.10)"  : "rgba(0,0,0,0.10)";
  const inputBg     = isDark ? "rgba(255,255,255,0.07)"  : "rgba(0,0,0,0.04)";
  const inputBorder = isDark ? "rgba(255,255,255,0.12)"  : "rgba(0,0,0,0.10)";
  const inputTxt    = isDark ? "#fff"                    : "#111827";

  return (
    <div
      className="flex-shrink-0 w-72 flex flex-col rounded-2xl max-h-full animate-slide-in overflow-hidden"
      style={{
        background: colBg,
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: isDraggingList
          ? `1px solid ${accentColor}66`
          : `1px solid ${colBorder}`,
        boxShadow: colShadow,
        transition: "box-shadow 0.2s, border-color 0.2s",
        // Slight rotation while dragging for a "lifted" feel
        rotate: isDraggingList ? "1.5deg" : "0deg",
      }}
    >
      {/* Top accent bar */}
      <div
        className="h-0.5 w-full flex-shrink-0"
        style={{ background: `linear-gradient(90deg, ${accentColor}, ${accentColor}44)` }}
      />

      {/* Column header */}
      <div className="flex items-center gap-2 px-4 pt-3 pb-3">
        {/* ── Drag handle for list reorder ── */}
        <div
          {...dragHandleProps}
          role="button"
          aria-label="Drag to reorder list"
          tabIndex={-1}
          className="p-0.5 rounded cursor-grab active:cursor-grabbing transition-opacity opacity-30 hover:opacity-70 flex-shrink-0"
          style={{ color: isDark ? "#fff" : "#374151", touchAction: "none" }}
        >
          <GripVertical size={14} />
        </div>

        {/* Color dot */}
        <span
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: accentColor, boxShadow: `0 0 6px ${accentColor}88` }}
        />

        {/* Title — double-click to rename */}
        {renaming ? (
          <input
            ref={renameRef}
            value={renameVal}
            onChange={(e) => setRenameVal(e.target.value)}
            onBlur={saveRename}
            onKeyDown={(e) => {
              if (e.key === "Enter")  saveRename();
              if (e.key === "Escape") { setRenaming(false); setRenameVal(list.title); }
            }}
            className="flex-1 bg-transparent outline-none text-sm font-bold border-b"
            style={{ borderColor: accentColor, color: headerTxt }}
          />
        ) : (
          <h3
            className="flex-1 text-sm font-bold truncate cursor-pointer hover:opacity-80 transition-opacity"
            style={{ color: headerTxt }}
            onDoubleClick={startRename}
            title="Double-click to rename"
          >
            {list.title}
          </h3>
        )}

        {/* Card count / WIP badge */}
        <span
          className={`min-w-[22px] h-5 px-1.5 rounded-full text-[11px] font-bold
            flex items-center justify-center transition-colors
            ${atWip ? "bg-red-500/20 text-red-400" : ""}`}
          style={atWip ? {} : {
            background: isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.07)",
            color: subTxt,
          }}
        >
          {cards.length}
          {list.wipLimit ? `/${list.wipLimit}` : ""}
        </span>

        {/* Column menu */}
        <div className="relative">
          <button
            onClick={() => setShowMenu((o) => !o)}
            disabled={duplicating}
            className="p-1.5 rounded-lg transition-all disabled:opacity-50"
            style={{ color: isDark ? "rgba(255,255,255,0.30)" : "#9ca3af" }}
          >
            <MoreHorizontal size={14} />
          </button>

          {showMenu && (
            <>
              <div className="fixed inset-0 z-20" onClick={() => setShowMenu(false)} />
              <div
                className="absolute top-full right-0 mt-1 w-48 rounded-xl overflow-hidden z-30
                  animate-scale-in shadow-2xl"
                style={{
                  background: menuBg,
                  border: `1px solid ${menuBorder}`,
                  backdropFilter: "blur(12px)",
                  boxShadow: isDark ? "0 20px 60px rgba(0,0,0,0.60)" : "0 8px 30px rgba(0,0,0,0.12)",
                }}
              >
                {/* Add a card */}
                <button
                  onClick={() => { setShowAddCard(true); setShowMenu(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm transition-colors"
                  style={{ color: isDark ? "#cbd5e1" : "#374151" }}
                >
                  <Plus size={14} className="text-violet-400" />
                  Add a card
                </button>

                {/* Rename */}
                <button
                  onClick={startRename}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm transition-colors"
                  style={{ color: isDark ? "#cbd5e1" : "#374151" }}
                >
                  <Edit3 size={14} className="text-blue-400" />
                  Rename list
                </button>

                {/* Set WIP limit */}
                <button
                  onClick={() => { setEditWip(true); setShowMenu(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm transition-colors"
                  style={{ color: isDark ? "#cbd5e1" : "#374151" }}
                >
                  <Gauge size={14} className="text-amber-400" />
                  {list.wipLimit ? `WIP limit: ${list.wipLimit}` : "Set WIP limit"}
                </button>

                {/* Duplicate */}
                <button
                  onClick={handleDuplicate}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm transition-colors"
                  style={{ color: isDark ? "#cbd5e1" : "#374151" }}
                >
                  <Copy size={14} className="text-emerald-400" />
                  Duplicate list
                </button>

                <div style={{ borderTop: isDark ? "1px solid rgba(255,255,255,0.05)" : "1px solid rgba(0,0,0,0.06)" }} />

                {/* Archive */}
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

      {/* WIP limit inline editor */}
      {editWip && (
        <div className="mx-3 mb-2 flex items-center gap-2 animate-scale-in">
          <input
            autoFocus
            type="number"
            min="1"
            value={wipVal}
            onChange={(e) => setWipVal(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter")  saveWip();
              if (e.key === "Escape") { setEditWip(false); setWipVal(list.wipLimit ?? ""); }
            }}
            placeholder="WIP limit (blank = off)"
            className="flex-1 px-2.5 py-1.5 rounded-lg text-xs outline-none focus:ring-1 focus:ring-amber-400/60"
            style={{
              background: inputBg,
              border: `1px solid ${inputBorder}`,
              color: inputTxt,
            }}
          />
          <button
            onClick={saveWip}
            className="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-white text-xs font-semibold transition-all"
          >
            Set
          </button>
          <button
            onClick={() => { setEditWip(false); setWipVal(list.wipLimit ?? ""); }}
            className="p-1.5 rounded-lg text-xs transition-colors"
            style={{ color: subTxt }}
          >
            <X size={12} />
          </button>
        </div>
      )}

      {/* WIP warning */}
      {atWip && (
        <div className="mx-3 mb-2 px-3 py-1.5 rounded-xl bg-red-500/10 border border-red-500/20
          text-red-400 text-xs flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse-dot" />
          WIP limit reached ({list.wipLimit})
        </div>
      )}

      {/* ── Cards — wrapped in a Droppable ── */}
      <Droppable droppableId={list._id} type="CARD">
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className="flex-1 overflow-y-auto px-3 py-1 min-h-0"
            style={{
              // Highlight drop zone
              background: snapshot.isDraggingOver
                ? isDark
                  ? "rgba(124,58,237,0.08)"
                  : "rgba(124,58,237,0.05)"
                : "transparent",
              transition: "background 0.15s ease",
              // Ensure minimum height so empty lists can still receive drops
              minHeight: cards.length === 0 ? "80px" : undefined,
            }}
          >
            <div className="space-y-2">
              {cards.map((card, cardIdx) => (
                <CardItem
                  key={card._id}
                  card={card}
                  index={cardIdx}
                  onClick={() => onCardClick?.(card)}
                />
              ))}
              {provided.placeholder}
            </div>
            {cards.length === 0 && !showAddCard && (
              <div className="py-6 flex flex-col items-center justify-center text-center">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center mb-2 transition-all duration-200"
                  style={{
                    background: snapshot.isDraggingOver
                      ? isDark ? "rgba(124,58,237,0.15)" : "rgba(124,58,237,0.10)"
                      : isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)",
                  }}
                >
                  <Plus
                    size={14}
                    style={{
                      color: snapshot.isDraggingOver
                        ? "#a78bfa"
                        : isDark ? "rgba(255,255,255,0.20)" : "#d1d5db"
                    }}
                  />
                </div>
                <p
                  className="text-xs transition-colors duration-200"
                  style={{
                    color: snapshot.isDraggingOver
                      ? isDark ? "rgba(167,139,250,0.80)" : "rgba(124,58,237,0.70)"
                      : isDark ? "rgba(255,255,255,0.20)" : "#d1d5db"
                  }}
                >
                  {snapshot.isDraggingOver ? "Release to drop here" : "No cards yet — click to add one"}
                </p>
              </div>
            )}
          </div>
        )}
      </Droppable>

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
              className="w-full px-3 py-2.5 rounded-xl text-sm resize-none transition-all outline-none focus:ring-2 focus:ring-violet-500/60"
              style={{
                background: inputBg,
                border: `1px solid ${inputBorder}`,
                color: inputTxt,
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
                className="p-2 rounded-xl transition-colors"
                style={{
                  background: isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.06)",
                  color: isDark ? "rgba(255,255,255,0.60)" : "#6b7280",
                }}
              >
                <X size={14} />
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setShowAddCard(true)}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm
              transition-all group"
            style={{ color: isDark ? "rgba(255,255,255,0.30)" : "#9ca3af" }}
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
