import React, { memo } from "react";
import { Draggable } from "@hello-pangea/dnd";
import { Calendar, CheckSquare, MessageSquare, Paperclip } from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getPriorityClass = (priority) => {
  const map = {
    low: "low",
    medium: "medium",
    high: "high",
    critical: "critical",
  };
  return map[priority] || "";
};

const getDueDateStatus = (dueDate) => {
  if (!dueDate) return null;
  const now = new Date();
  const due = new Date(dueDate);
  const diffDays = Math.ceil((due - now) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return "overdue";
  if (diffDays === 0) return "today";
  return "upcoming";
};

const formatDate = (date) => {
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const getAvatarColor = (name = "") => {
  const colors = [
    "#8b5cf6","#6366f1","#0ea5e9","#10b981","#f59e0b","#f43f5e","#ec4899",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

// ─── Avatar ───────────────────────────────────────────────────────────────────

const Avatar = ({ user }) => {
  const color = user?.avatarColor || getAvatarColor(user?.name || "");
  const initials = (user?.name || "?")
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  return (
    <div
      className="avatar"
      style={{ background: color }}
      title={user?.name}
    >
      {user?.avatar ? (
        <img src={user.avatar} alt={user.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        <span style={{ color: "#fff", fontSize: "9px", fontWeight: 700 }}>{initials}</span>
      )}
    </div>
  );
};

// ─── Card ─────────────────────────────────────────────────────────────────────

const KanbanCard = memo(({ card, index, boardLabels = [], onClick }) => {
  const priorityClass = getPriorityClass(card.priority);
  const dueDateStatus = getDueDateStatus(card.dueDate);

  const checklistItems = card.checklists?.flatMap((cl) => cl.items) || [];
  const checklistDone = checklistItems.filter((i) => i.completed).length;
  const hasChecklist = checklistItems.length > 0;

  const commentCount = card.comments?.length || 0;
  const attachmentCount = card.attachments?.length || 0;

  // Resolve labels from board label palette
  const cardLabels = (card.labels || [])
    .map((id) => boardLabels.find((l) => l._id === id))
    .filter(Boolean);

  return (
    <Draggable draggableId={card._id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`kanban-card priority-${card.priority || "none"} ${
            snapshot.isDragging ? "is-dragging" : ""
          }`}
          onClick={onClick}
          style={{
            ...provided.draggableProps.style,
          }}
        >
          {/* Cover color strip */}
          {card.coverColor && (
            <div
              style={{
                height: 6,
                borderRadius: "6px 6px 0 0",
                background: card.coverColor,
                margin: "-10px -12px 10px",
              }}
            />
          )}

          {/* Label chips row */}
          {cardLabels.length > 0 && (
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 8 }}>
              {cardLabels.map((label) => (
                <span
                  key={label._id}
                  className="label-chip"
                  style={{ background: label.color }}
                  title={label.name}
                />
              ))}
            </div>
          )}

          {/* Title */}
          <p className="kanban-card-title">{card.title}</p>

          {/* Priority badge */}
          {card.priority && card.priority !== "none" && (
            <div style={{ marginBottom: 8 }}>
              <span className={`priority-badge ${card.priority}`}>
                {card.priority === "critical" ? "🔥" : ""} {card.priority}
              </span>
            </div>
          )}

          {/* Footer meta */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {/* Due date */}
              {card.dueDate && dueDateStatus && (
                <span className={`due-chip ${dueDateStatus}`}>
                  <Calendar size={10} />
                  {formatDate(card.dueDate)}
                </span>
              )}

              {/* Checklist progress */}
              {hasChecklist && (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 3,
                    fontSize: 11,
                    color: checklistDone === checklistItems.length ? "var(--accent-emerald)" : "var(--text-muted)",
                  }}
                >
                  <CheckSquare size={11} />
                  {checklistDone}/{checklistItems.length}
                </span>
              )}

              {/* Comments */}
              {commentCount > 0 && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 11, color: "var(--text-muted)" }}>
                  <MessageSquare size={11} />
                  {commentCount}
                </span>
              )}

              {/* Attachments */}
              {attachmentCount > 0 && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 11, color: "var(--text-muted)" }}>
                  <Paperclip size={11} />
                  {attachmentCount}
                </span>
              )}
            </div>

            {/* Assignee avatars */}
            {card.assignees?.length > 0 && (
              <div className="avatar-stack">
                {card.assignees.slice(0, 3).map((u) => (
                  <Avatar key={u._id} user={u} />
                ))}
                {card.assignees.length > 3 && (
                  <div
                    className="avatar"
                    style={{ background: "var(--bg-elevated)", color: "var(--text-muted)", fontSize: 9, border: "2px solid var(--bg-card)" }}
                  >
                    +{card.assignees.length - 3}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </Draggable>
  );
});

KanbanCard.displayName = "KanbanCard";
export default KanbanCard;
