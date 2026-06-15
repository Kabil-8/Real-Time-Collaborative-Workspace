import React from "react";
import { Clock, Flag, MessageSquare, Paperclip } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";

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
  const { isDark } = useTheme();
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
        background: isDark ? "rgba(15,23,42,0.70)" : "#ffffff",
        border: isDark ? "1px solid rgba(255,255,255,0.07)" : "1px solid rgba(0,0,0,0.07)",
        backdropFilter: isDark ? "blur(8px)" : "none",
        WebkitBackdropFilter: isDark ? "blur(8px)" : "none",
        boxShadow: isDark ? "0 2px 12px rgba(0,0,0,0.25)" : "0 1px 3px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.05)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = isDark
          ? `0 8px 30px rgba(0,0,0,0.40), 0 0 0 1px rgba(124,58,237,0.20)${cfg ? `, ${cfg.glow}` : ""}`
          : `0 8px 24px rgba(0,0,0,0.10), 0 0 0 1px rgba(124,58,237,0.15)${cfg ? `, ${cfg.glow}` : ""}`;
        e.currentTarget.style.borderColor = isDark ? "rgba(255,255,255,0.12)" : "rgba(124,58,237,0.20)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = isDark ? "0 2px 12px rgba(0,0,0,0.25)" : "0 1px 3px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.05)";
        e.currentTarget.style.borderColor = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)";
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
        <p className={`text-sm font-medium leading-snug mb-2.5
          group-hover:text-violet-600 transition-colors
          ${card.coverColor ? "mt-1" : ""}`}
          style={{ color: isDark ? "rgba(255,255,255,0.90)" : "#111827" }}
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
              ${
                overdue
                  ? "bg-red-500/20 text-red-500 border-red-500/25"
                  : nearDue
                    ? "bg-amber-500/20 text-amber-600 border-amber-500/25"
                    : isDark
                      ? "border-white/10 bg-white/8"
                      : "border-slate-200 bg-slate-100"
              }`}
              style={!overdue && !nearDue ? { color: isDark ? "rgba(255,255,255,0.40)" : "#6b7280" } : {}}
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
