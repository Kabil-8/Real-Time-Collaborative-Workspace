import React, { useState, useRef, useEffect } from "react";
import { Droppable } from "@hello-pangea/dnd";
import { MoreHorizontal, Plus, Trash2, X } from "lucide-react";
import KanbanCard from "./KanbanCard";
import TypingIndicator from "./TypingIndicator";

// ─── Inline Add Card form ─────────────────────────────────────────────────────
const AddCardInline = ({ onAdd, onCancel, onTyping }) => {
  const [title, setTitle] = useState("");
  const textareaRef = useRef(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;
    onAdd(t);
    setTitle("");
  };

  const handleChange = (e) => {
    setTitle(e.target.value);
    onTyping?.();
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <textarea
        ref={textareaRef}
        value={title}
        onChange={handleChange}
        placeholder="Enter card title…"
        rows={2}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(e); }
          if (e.key === "Escape") onCancel();
        }}
        style={{
          width: "100%",
          padding: "8px 10px",
          borderRadius: "var(--radius-sm)",
          background: "var(--bg-input)",
          border: "1.5px solid var(--border-focus)",
          color: "var(--text-primary)",
          fontSize: 13.5,
          fontFamily: "inherit",
          resize: "none",
          outline: "none",
          lineHeight: 1.45,
          boxShadow: "0 0 0 3px rgba(139,92,246,.15)",
        }}
      />
      <div style={{ display: "flex", gap: 6 }}>
        <button type="submit" className="btn btn-primary btn-sm">
          <Plus size={13} /> Add card
        </button>
        <button type="button" className="btn-icon" onClick={onCancel}>
          <X size={15} />
        </button>
      </div>
    </form>
  );
};

// ─── List header title editor ─────────────────────────────────────────────────
const ListTitleEditor = ({ title, onSave }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(title);
  const inputRef = useRef(null);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const save = () => {
    const t = draft.trim();
    if (t && t !== title) onSave(t);
    setEditing(false);
  };

  if (!editing) {
    return (
      <span
        className="kanban-list-title"
        onDoubleClick={() => setEditing(true)}
        title="Double-click to rename"
      >
        {title}
      </span>
    );
  }

  return (
    <input
      ref={inputRef}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={save}
      onKeyDown={(e) => {
        if (e.key === "Enter") save();
        if (e.key === "Escape") { setDraft(title); setEditing(false); }
      }}
      className="kanban-list-title-input"
    />
  );
};

// ─── List menu ────────────────────────────────────────────────────────────────
const ListMenu = ({ onDelete, onClose }) => (
  <div
    style={{
      position: "absolute",
      top: "100%",
      right: 0,
      marginTop: 4,
      background: "var(--bg-elevated)",
      border: "1px solid var(--border-default)",
      borderRadius: "var(--radius-md)",
      boxShadow: "var(--shadow-lg)",
      overflow: "hidden",
      zIndex: 100,
      minWidth: 160,
    }}
  >
    <button
      className="btn-ghost"
      onClick={onDelete}
      style={{
        width: "100%",
        textAlign: "left",
        padding: "9px 14px",
        display: "flex",
        alignItems: "center",
        gap: 8,
        fontSize: 13,
        color: "var(--accent-rose)",
        background: "transparent",
        border: "none",
        cursor: "pointer",
        borderRadius: 0,
      }}
    >
      <Trash2 size={13} /> Archive list
    </button>
  </div>
);

// ─── KanbanList ───────────────────────────────────────────────────────────────
const KanbanList = ({ list, index, boardLabels, onUpdateList, onDeleteList, onAddCard, onCardClick, typingUsers = [], emitTyping }) => {
  const [addingCard, setAddingCard] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const cardCount = list.cards?.length || 0;
  const wipExceeded = list.wipLimit && cardCount > list.wipLimit;

  const handleAddCard = (title) => {
    onAddCard(list._id, title);
    setAddingCard(false);
  };

  const handleTyping = () => {
    emitTyping?.(`card-list:${list._id}`);
  };

  return (
    <div className="kanban-list" style={{ borderTop: list.color ? `3px solid ${list.color}` : undefined }}>
      {/* Header */}
      <div className="kanban-list-header">
        <ListTitleEditor title={list.title} onSave={(t) => onUpdateList(list._id, { title: t })} />

        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0, marginLeft: 8 }}>
          {/* Card count / WIP */}
          <span className={`wip-badge ${wipExceeded ? "exceeded" : ""}`}>
            {list.wipLimit ? `${cardCount}/${list.wipLimit}` : cardCount}
          </span>

          {/* Menu */}
          <div style={{ position: "relative" }}>
            <button
              className="btn-icon"
              onClick={() => setMenuOpen((o) => !o)}
              title="List options"
            >
              <MoreHorizontal size={15} />
            </button>
            {menuOpen && (
              <>
                <div
                  style={{ position: "fixed", inset: 0, zIndex: 99 }}
                  onClick={() => setMenuOpen(false)}
                />
                <ListMenu
                  onDelete={() => { onDeleteList(list._id); setMenuOpen(false); }}
                  onClose={() => setMenuOpen(false)}
                />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Cards droppable */}
      <Droppable droppableId={list._id} type="CARD">
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`kanban-list-cards ${snapshot.isDraggingOver ? "" : ""}`}
            style={{
              background: snapshot.isDraggingOver ? "var(--kanban-drag-overlay)" : undefined,
              transition: "background .15s ease",
              borderRadius: snapshot.isDraggingOver ? "0 0 var(--radius-lg) var(--radius-lg)" : undefined,
            }}
          >
            {(list.cards || []).map((card, i) => (
              <KanbanCard
                key={card._id}
                card={card}
                index={i}
                boardLabels={boardLabels}
                onClick={() => onCardClick(card, list)}
              />
            ))}
            {provided.placeholder}

            {/* Inline add card form */}
            {addingCard && (
              <AddCardInline
                onAdd={handleAddCard}
                onCancel={() => setAddingCard(false)}
                onTyping={handleTyping}
              />
            )}

            {/* Per-list typing indicator */}
            {typingUsers.length > 0 && (
              <div style={{ padding: "4px 2px 2px" }}>
                <TypingIndicator users={typingUsers} inline />
              </div>
            )}
          </div>
        )}
      </Droppable>

      {/* Footer */}
      {!addingCard && (
        <div className="kanban-list-footer">
          <button className="add-card-btn" onClick={() => setAddingCard(true)}>
            <Plus size={14} /> Add a card
          </button>
        </div>
      )}
    </div>
  );
};

export default KanbanList;
