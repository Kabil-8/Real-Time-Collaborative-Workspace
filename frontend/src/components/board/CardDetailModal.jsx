import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  X, Tag, Calendar, Flag, CheckSquare,
  Trash2, MessageSquare, Plus, Check, Circle,
} from "lucide-react";
import { useSocket } from "../../context/SocketContext";
import TypingIndicator from "./TypingIndicator";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const PRIORITY_OPTIONS = [
  { value: "none",     label: "None",     color: "var(--text-muted)" },
  { value: "low",      label: "Low",      color: "#22d3ee" },
  { value: "medium",   label: "Medium",   color: "#fbbf24" },
  { value: "high",     label: "High",     color: "#fb7185" },
  { value: "critical", label: "Critical", color: "#f43f5e" },
];

const COVER_COLORS = [
  "#8b5cf6","#6366f1","#0ea5e9","#10b981","#f59e0b",
  "#f43f5e","#ec4899","#84cc16","#f97316","#06b6d4",
];

const formatDateInput = (date) => {
  if (!date) return "";
  return new Date(date).toISOString().split("T")[0];
};

const getAvatarColor = (name = "") => {
  const colors = ["#8b5cf6","#6366f1","#0ea5e9","#10b981","#f59e0b","#f43f5e","#ec4899"];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const SectionHeader = ({ icon: Icon, label }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
    <Icon size={14} style={{ color: "var(--text-muted)" }} />
    <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".06em" }}>
      {label}
    </span>
  </div>
);

const AvatarSmall = ({ user }) => {
  const color = user?.avatarColor || getAvatarColor(user?.name || "");
  const initials = (user?.name || "?").split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
  return (
    <div style={{ width: 28, height: 28, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden" }}>
      {user?.avatar ? <img src={user.avatar} alt={user.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ color: "#fff", fontSize: 11, fontWeight: 700 }}>{initials}</span>}
    </div>
  );
};

// ─── Main modal ───────────────────────────────────────────────────────────────

const CardDetailModal = ({ card: initialCard, list, board, onClose, onUpdate, onDelete, onAddComment, onDeleteComment, currentUser, boardId, emitTyping }) => {
  const [card, setCard] = useState(initialCard);
  const [commentText, setCommentText] = useState("");
  const [saving, setSaving] = useState(false);
  const [commentTypingUsers, setCommentTypingUsers] = useState([]);
  const { socket } = useSocket();
  const cardContext = `card:${initialCard._id}`;
  const stopTypingTimer = useRef(null);

  // ── Real-time: subscribe to comment events for this card ──────────────────
  useEffect(() => {
    if (!socket) return;

    const handleCommentAdded = ({ cardId, comment }) => {
      if (cardId !== card._id) return;
      // Skip if from current user (we already added it optimistically)
      if (comment.author?._id === currentUser?._id) return;
      setCard((c) => ({
        ...c,
        comments: [...(c.comments || []), comment],
      }));
    };

    const handleCommentDeleted = ({ cardId, commentId }) => {
      if (cardId !== card._id) return;
      setCard((c) => ({
        ...c,
        comments: (c.comments || []).filter((cm) => cm._id !== commentId),
      }));
    };

    const handleCardUpdated = ({ card: updatedCard }) => {
      if (updatedCard._id !== card._id) return;
      setCard((prev) => ({ ...prev, ...updatedCard }));
    };

    // ── Typing in comment box ────────────────────────────────────────────────
    const handleTyping = ({ user, isTyping, context }) => {
      if (context !== cardContext) return;
      if (user.userId === currentUser?._id?.toString()) return;

      setCommentTypingUsers((prev) => {
        const filtered = prev.filter((u) => u.userId !== user.userId);
        return isTyping ? [...filtered, user] : filtered;
      });
    };

    socket.on("card:comment_added", handleCommentAdded);
    socket.on("card:comment_deleted", handleCommentDeleted);
    socket.on("card:updated", handleCardUpdated);
    socket.on("user:typing", handleTyping);

    return () => {
      socket.off("card:comment_added", handleCommentAdded);
      socket.off("card:comment_deleted", handleCommentDeleted);
      socket.off("card:updated", handleCardUpdated);
      socket.off("user:typing", handleTyping);
      // Emit stop typing on close
      if (socket && boardId) {
        socket.emit("typing:stop", { boardId, context: cardContext });
      }
    };
  }, [socket, card._id, boardId, currentUser, cardContext]);

  // ── Emit typing when user types in comment field ───────────────────────────
  const handleCommentTyping = () => {
    if (!socket || !boardId) return;

    socket.emit("typing:start", { boardId, context: cardContext });

    if (stopTypingTimer.current) clearTimeout(stopTypingTimer.current);
    stopTypingTimer.current = setTimeout(() => {
      socket.emit("typing:stop", { boardId, context: cardContext });
    }, 2000);
  };

  // ── Card field updates ─────────────────────────────────────────────────────
  const handleUpdate = useCallback(async (updates) => {
    setSaving(true);
    const updated = { ...card, ...updates };
    setCard(updated); // Optimistic
    await onUpdate(board._id, list._id, card._id, updates);
    setSaving(false);
  }, [card, board, list, onUpdate]);

  // ── Comment submit ─────────────────────────────────────────────────────────
  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    const text = commentText.trim();
    if (!text) return;

    // Stop typing indicator immediately
    if (socket && boardId) {
      socket.emit("typing:stop", { boardId, context: cardContext });
      if (stopTypingTimer.current) clearTimeout(stopTypingTimer.current);
    }

    const result = await onAddComment(board._id, list._id, card._id, text);
    if (result?.success) {
      setCard((c) => ({
        ...c,
        comments: [...(c.comments || []), result.comment],
      }));
      setCommentText("");
    }
  };

  const handleToggleChecklistItem = async (clIndex, itemIndex) => {
    const updated = JSON.parse(JSON.stringify(card.checklists));
    updated[clIndex].items[itemIndex].completed = !updated[clIndex].items[itemIndex].completed;
    handleUpdate({ checklists: updated });
  };

  // Checklist progress
  const allItems = (card.checklists || []).flatMap((cl) => cl.items);
  const doneItems = allItems.filter((i) => i.completed).length;
  const progress = allItems.length ? Math.round((doneItems / allItems.length) * 100) : 0;

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-panel">
        {/* Cover */}
        {card.coverColor && (
          <div style={{ height: 80, background: card.coverColor, borderRadius: "var(--radius-xl) var(--radius-xl) 0 0" }} />
        )}

        <div style={{ padding: "24px 28px" }}>
          {/* Header row */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
            <div style={{ flex: 1, marginRight: 12 }}>
              {/* Editable title */}
              <textarea
                value={card.title}
                onChange={(e) => setCard((c) => ({ ...c, title: e.target.value }))}
                onBlur={() => handleUpdate({ title: card.title })}
                rows={1}
                style={{
                  width: "100%",
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  fontSize: 22,
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  fontFamily: "inherit",
                  resize: "none",
                  lineHeight: 1.3,
                  padding: 0,
                }}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); e.target.blur(); } }}
              />
              <p style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: 4 }}>
                in <strong style={{ color: "var(--text-secondary)" }}>{list.title}</strong>
                {saving && <span style={{ marginLeft: 8, fontSize: 11, color: "var(--accent-brand)" }}>Saving…</span>}
              </p>
            </div>
            <button className="btn-icon" onClick={onClose} style={{ flexShrink: 0 }}>
              <X size={18} />
            </button>
          </div>

          {/* Two-column layout */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 220px", gap: 24 }}>
            {/* LEFT: Main content */}
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {/* Description */}
              <div>
                <SectionHeader icon={Tag} label="Description" />
                <textarea
                  value={card.description || ""}
                  onChange={(e) => setCard((c) => ({ ...c, description: e.target.value }))}
                  onBlur={() => handleUpdate({ description: card.description })}
                  placeholder="Add a more detailed description…"
                  rows={4}
                  className="field-input"
                  style={{ resize: "vertical", fontSize: 13.5, lineHeight: 1.6 }}
                />
              </div>

              {/* Checklists */}
              {(card.checklists || []).length > 0 && (
                <div>
                  <SectionHeader icon={CheckSquare} label="Checklist" />
                  {allItems.length > 0 && (
                    <div style={{ marginBottom: 8 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{progress}%</span>
                      </div>
                      <div className="checklist-bar">
                        <div className="checklist-bar-fill" style={{ width: `${progress}%` }} />
                      </div>
                    </div>
                  )}
                  {(card.checklists || []).map((cl, ci) => (
                    <div key={ci} style={{ marginBottom: 12 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>{cl.title}</p>
                      {cl.items.map((item, ii) => (
                        <div
                          key={ii}
                          style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", cursor: "pointer" }}
                          onClick={() => handleToggleChecklistItem(ci, ii)}
                        >
                          <div style={{
                            width: 16, height: 16, borderRadius: 4,
                            border: `2px solid ${item.completed ? "var(--brand-400)" : "var(--border-strong)"}`,
                            background: item.completed ? "var(--brand-400)" : "transparent",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            flexShrink: 0, transition: "all .15s ease",
                          }}>
                            {item.completed && <Check size={10} color="#fff" strokeWidth={3} />}
                          </div>
                          <span style={{ fontSize: 13, color: item.completed ? "var(--text-muted)" : "var(--text-primary)", textDecoration: item.completed ? "line-through" : "none" }}>
                            {item.text}
                          </span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}

              {/* Comments */}
              <div>
                <SectionHeader icon={MessageSquare} label={`Comments${card.comments?.length ? ` (${card.comments.length})` : ""}`} />

                {/* Comment input */}
                <form onSubmit={handleCommentSubmit} style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                  {currentUser && <AvatarSmall user={currentUser} />}
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                    <textarea
                      value={commentText}
                      onChange={(e) => {
                        setCommentText(e.target.value);
                        handleCommentTyping();
                      }}
                      placeholder="Write a comment…"
                      rows={2}
                      className="field-input"
                      style={{ resize: "none", fontSize: 13 }}
                      onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleCommentSubmit(e); } }}
                    />
                    {commentText.trim() && (
                      <div style={{ display: "flex", gap: 6 }}>
                        <button type="submit" className="btn btn-primary btn-sm">Save</button>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setCommentText("")}>Cancel</button>
                      </div>
                    )}
                  </div>
                </form>

                {/* Typing indicator for comments */}
                {commentTypingUsers.length > 0 && (
                  <div style={{ marginBottom: 10 }}>
                    <TypingIndicator users={commentTypingUsers} inline />
                  </div>
                )}

                {/* Comment list */}
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {(card.comments || []).map((comment) => (
                    <div key={comment._id} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                      <AvatarSmall user={comment.author} />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 4 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
                            {comment.author?.name}
                          </span>
                          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                            {new Date(comment.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        <div className="comment-bubble">{comment.text}</div>
                      </div>
                      {comment.author?._id === currentUser?._id && (
                        <button
                          className="btn-icon"
                          onClick={() => onDeleteComment && onDeleteComment(card._id, comment._id)}
                          title="Delete comment"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  ))}
                  {(card.comments || []).length === 0 && (
                    <p style={{ fontSize: 12.5, color: "var(--text-muted)", fontStyle: "italic" }}>
                      No comments yet. Be the first to comment!
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* RIGHT: Sidebar */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Priority */}
              <div>
                <SectionHeader icon={Flag} label="Priority" />
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {PRIORITY_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => handleUpdate({ priority: opt.value })}
                      style={{
                        display: "flex", alignItems: "center", gap: 8,
                        padding: "6px 10px", borderRadius: "var(--radius-sm)",
                        background: card.priority === opt.value ? "var(--bg-active)" : "transparent",
                        border: card.priority === opt.value ? "1px solid var(--border-default)" : "1px solid transparent",
                        cursor: "pointer", fontSize: 13, color: opt.color, fontWeight: 500,
                        transition: "all .15s ease",
                      }}
                    >
                      <Circle size={8} fill={opt.color} color={opt.color} />
                      {opt.label}
                      {card.priority === opt.value && <Check size={12} style={{ marginLeft: "auto" }} />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Due date */}
              <div>
                <SectionHeader icon={Calendar} label="Due Date" />
                <input
                  type="date"
                  value={formatDateInput(card.dueDate)}
                  onChange={(e) => handleUpdate({ dueDate: e.target.value || null })}
                  className="field-input"
                  style={{ fontSize: 13 }}
                />
              </div>

              {/* Cover color */}
              <div>
                <SectionHeader icon={Tag} label="Cover" />
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  <button
                    onClick={() => handleUpdate({ coverColor: null })}
                    style={{
                      width: 28, height: 28, borderRadius: "var(--radius-sm)",
                      background: "var(--bg-elevated)", border: card.coverColor ? "1px solid var(--border-default)" : "2px solid var(--brand-400)",
                      cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                    title="No cover"
                  >
                    <X size={12} color="var(--text-muted)" />
                  </button>
                  {COVER_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => handleUpdate({ coverColor: c })}
                      style={{
                        width: 28, height: 28, borderRadius: "var(--radius-sm)",
                        background: c,
                        border: card.coverColor === c ? "3px solid var(--text-primary)" : "2px solid transparent",
                        cursor: "pointer",
                        transition: "transform .1s ease",
                      }}
                      title={c}
                    />
                  ))}
                </div>
              </div>

              {/* Labels */}
              {(board.labels || []).length > 0 && (
                <div>
                  <SectionHeader icon={Tag} label="Labels" />
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {board.labels.map((label) => {
                      const isActive = (card.labels || []).includes(label._id);
                      return (
                        <button
                          key={label._id}
                          onClick={() => {
                            const newLabels = isActive
                              ? (card.labels || []).filter((id) => id !== label._id)
                              : [...(card.labels || []), label._id];
                            handleUpdate({ labels: newLabels });
                          }}
                          style={{
                            display: "flex", alignItems: "center", gap: 8,
                            padding: "5px 8px", borderRadius: "var(--radius-sm)",
                            background: isActive ? `${label.color}22` : "transparent",
                            border: `1px solid ${isActive ? label.color : "transparent"}`,
                            cursor: "pointer", fontSize: 12.5, fontWeight: 500,
                            color: isActive ? label.color : "var(--text-secondary)",
                            transition: "all .15s ease",
                          }}
                        >
                          <span style={{ width: 10, height: 10, borderRadius: "50%", background: label.color, flexShrink: 0 }} />
                          {label.name}
                          {isActive && <Check size={11} style={{ marginLeft: "auto" }} />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Archive card */}
              <div style={{ marginTop: "auto", paddingTop: 8, borderTop: "1px solid var(--border-subtle)" }}>
                <button
                  className="btn btn-danger btn-sm"
                  style={{ width: "100%", justifyContent: "center" }}
                  onClick={() => { onDelete && onDelete(list._id, card._id); onClose(); }}
                >
                  <Trash2 size={13} /> Archive card
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CardDetailModal;
