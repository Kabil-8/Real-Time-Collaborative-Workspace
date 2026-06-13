import React from "react";
import { Clock, Flag, User } from "lucide-react";

const PRIORITY_STYLES = {
  critical: "bg-red-500/20 text-red-400 border-red-500/30",
  high:     "bg-orange-500/20 text-orange-400 border-orange-500/30",
  medium:   "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  low:      "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  none:     "",
};

const PRIORITY_LABELS = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
  none: null,
};

const isOverdue = (date) => date && new Date(date) < new Date();
const formatDate = (date) =>
  new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" });

/**
 * CardItem — a compact Kanban card tile used inside a ListColumn.
 * Props: card, onClick
 */
const CardItem = ({ card, onClick }) => {
  const priority = card.priority || "none";
  const overdue = isOverdue(card.dueDate);

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick?.()}
      className="group relative bg-slate-800/70 hover:bg-slate-800 border border-slate-700/50
        hover:border-slate-600 rounded-xl p-3 cursor-pointer transition-all duration-150
        hover:shadow-lg hover:shadow-black/20 hover:-translate-y-px animate-fade-in"
    >
      {/* Cover color strip */}
      {card.coverColor && (
        <div
          className="absolute inset-x-0 top-0 h-1.5 rounded-t-xl"
          style={{ backgroundColor: card.coverColor }}
        />
      )}

      {/* Title */}
      <p className={`text-sm font-medium text-slate-200 leading-snug mb-2 ${card.coverColor ? "mt-1" : ""}`}>
        {card.title}
      </p>

      {/* Labels row */}
      {card.labels && card.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {card.labels.slice(0, 3).map((label, i) => (
            <span
              key={i}
              className="h-1.5 w-8 rounded-full opacity-80"
              style={{ backgroundColor: label || "#6366f1" }}
            />
          ))}
        </div>
      )}

      {/* Chips row */}
      <div className="flex items-center gap-2 flex-wrap mt-1">
        {/* Priority badge */}
        {priority !== "none" && (
          <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${PRIORITY_STYLES[priority]}`}>
            <Flag size={9} />
            {PRIORITY_LABELS[priority]}
          </span>
        )}

        {/* Due date */}
        {card.dueDate && (
          <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border
            ${overdue
              ? "bg-red-500/15 text-red-400 border-red-500/20"
              : "bg-slate-700/60 text-slate-400 border-slate-700"
            }`}
          >
            <Clock size={9} />
            {formatDate(card.dueDate)}
          </span>
        )}

        {/* Assignee avatars */}
        {card.assignees && card.assignees.length > 0 && (
          <div className="flex -space-x-1.5 ml-auto">
            {card.assignees.slice(0, 3).map((user) =>
              user?.avatar ? (
                <img
                  key={user._id}
                  src={user.avatar}
                  alt={user.name}
                  className="w-5 h-5 rounded-full border border-slate-800 object-cover"
                />
              ) : (
                <div
                  key={user._id || user}
                  className="w-5 h-5 rounded-full border border-slate-800 flex items-center justify-center text-[8px] font-bold text-white"
                  style={{ backgroundColor: user?.avatarColor || "#6366f1" }}
                >
                  {user?.name?.[0]?.toUpperCase() || "?"}
                </div>
              )
            )}
            {card.assignees.length > 3 && (
              <div className="w-5 h-5 rounded-full border border-slate-800 bg-slate-700 flex items-center justify-center text-[8px] text-slate-400">
                +{card.assignees.length - 3}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CardItem;
