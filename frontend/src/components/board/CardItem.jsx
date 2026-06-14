import React from "react";
import { Clock, Flag, MessageSquare, Paperclip } from "lucide-react";

const PRIORITY_CONFIG = {
  critical: {
    label: "Critical",
    classes: "bg-red-500/20 text-red-400 border-red-500/25",
    glow: "0 0 8px rgba(239,68,68,0.25)",
    dot: "#ef4444",
  },
  high: {
    label: "High",
    classes: "bg-orange-500/20 text-orange-400 border-orange-500/25",
    glow: "0 0 8px rgba(249,115,22,0.20)",
    dot: "#f97316",
  },
  medium: {
    label: "Medium",
    classes: "bg-yellow-500/20 text-yellow-400 border-yellow-500/25",
    glow: "0 0 8px rgba(234,179,8,0.20)",
    dot: "#eab308",
  },
  low: {
    label: "Low",
    classes: "bg-emerald-500/20 text-emerald-400 border-emerald-500/25",
    glow: "0 0 8px rgba(52,211,153,0.20)",
    dot: "#34d399",
  },
  none: null,
};

const isOverdue    = (date) => date && new Date(date) < new Date();
const isNearDue    = (date) => {
  if (!date) return false;
  const diff = new Date(date) - new Date();
  return diff > 0 && diff < 48 * 60 * 60 * 1000; // within 48h
};
const formatDate   = (date) =>
  new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" });

/**
 * CardItem — glass-morphism Kanban card with priority glow and date warning
 */
const CardItem = ({ card, onClick }) => {
  const priority  = card.priority || "none";
  const cfg       = PRIORITY_CONFIG[priority];
  const overdue   = isOverdue(card.dueDate);
  const nearDue   = isNearDue(card.dueDate);

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick?.()}
      className="group relative rounded-xl cursor-pointer transition-all duration-200
        hover:-translate-y-0.5 animate-fade-in overflow-hidden"
      style={{
        background: "rgba(15,23,42,0.70)",
        border: "1px solid rgba(255,255,255,0.07)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        boxShadow: "0 2px 12px rgba(0,0,0,0.25)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow =
          `0 8px 30px rgba(0,0,0,0.40), 0 0 0 1px rgba(124,58,237,0.20)${cfg ? `, ${cfg.glow}` : ""}`;
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.25)";
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)";
      }}
    >
      {/* Cover color strip */}
      {card.coverColor && (
        <div
          className="h-1.5 w-full"
          style={{ background: `linear-gradient(90deg, ${card.coverColor}, ${card.coverColor}88)` }}
        />
      )}

      <div className="p-3">
        {/* Labels */}
        {card.labels?.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {card.labels.slice(0, 4).map((label, i) => (
              <span
                key={i}
                className="h-1.5 w-7 rounded-full opacity-90"
                style={{ backgroundColor: label || "#7c3aed" }}
              />
            ))}
          </div>
        )}

        {/* Title */}
        <p className={`text-sm font-medium text-white/90 leading-snug mb-2.5
          group-hover:text-white transition-colors
          ${card.coverColor ? "mt-1" : ""}`}
        >
          {card.title}
        </p>

        {/* Chips row */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Priority badge */}
          {cfg && (
            <span
              className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px]
                font-bold border ${cfg.classes}`}
              style={{ boxShadow: cfg.glow }}
            >
              <Flag size={8} />
              {cfg.label}
            </span>
          )}

          {/* Due date */}
          {card.dueDate && (
            <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px]
              font-medium border transition-colors
              ${overdue
                ? "bg-red-500/20 text-red-400 border-red-500/25"
                : nearDue
                  ? "bg-amber-500/20 text-amber-400 border-amber-500/25"
                  : "bg-white/8 text-white/40 border-white/10"
              }`}
            >
              <Clock size={8} />
              {formatDate(card.dueDate)}
              {overdue && " ⚠"}
            </span>
          )}

          {/* Spacer */}
          <span className="flex-1" />

          {/* Assignee avatars */}
          {card.assignees?.length > 0 && (
            <div className="flex -space-x-1.5">
              {card.assignees.slice(0, 3).map((user) =>
                user?.avatar ? (
                  <img
                    key={user._id}
                    src={user.avatar}
                    alt={user.name}
                    className="w-5 h-5 rounded-full border border-slate-900 object-cover"
                  />
                ) : (
                  <div
                    key={user._id || user}
                    className="w-5 h-5 rounded-full border border-slate-900
                      flex items-center justify-center text-[8px] font-bold text-white"
                    style={{ background: `linear-gradient(135deg, ${user?.avatarColor || "#7c3aed"}, ${user?.avatarColor || "#4f46e5"})` }}
                    title={user?.name}
                  >
                    {user?.name?.[0]?.toUpperCase() || "?"}
                  </div>
                )
              )}
              {card.assignees.length > 3 && (
                <div className="w-5 h-5 rounded-full border border-slate-900
                  bg-slate-700 flex items-center justify-center text-[8px] text-slate-400">
                  +{card.assignees.length - 3}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CardItem;
