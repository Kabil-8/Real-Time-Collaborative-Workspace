import React from "react";
import { Clock, Flag, MessageSquare, GripVertical } from "lucide-react";
import { Draggable } from "@hello-pangea/dnd";
import { useTheme } from "../../context/ThemeContext";

const PRIORITY_CONFIG = {
  critical: { label: "Critical", classes: "bg-red-500/20 text-red-400 border-red-500/25",     glow: "0 0 8px rgba(239,68,68,0.25)",    dot: "#ef4444" },
  high:     { label: "High",     classes: "bg-orange-500/20 text-orange-400 border-orange-500/25", glow: "0 0 8px rgba(249,115,22,0.20)", dot: "#f97316" },
  medium:   { label: "Medium",   classes: "bg-yellow-500/20 text-yellow-400 border-yellow-500/25", glow: "0 0 8px rgba(234,179,8,0.20)", dot: "#eab308" },
  low:      { label: "Low",      classes: "bg-emerald-500/20 text-emerald-400 border-emerald-500/25", glow: "0 0 8px rgba(52,211,153,0.20)", dot: "#34d399" },
  none: null,
};

const isOverdue = (date) => date && new Date(date) < new Date();
const isNearDue = (date) => {
  if (!date) return false;
  const diff = new Date(date) - new Date();
  return diff > 0 && diff < 48 * 60 * 60 * 1000;
};
const formatDate = (date) =>
  new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" });

/**
 * CardItem — Kanban card wrapped in Draggable.
 *
 * New: accepts `isPending` prop from ListColumn (read from BoardContext).
 * When pending, shows a subtle shimmer overlay and pulsing violet border
 * to indicate an optimistic mutation is in-flight.
 */
const CardItem = ({ card, index, onClick, isPending = false }) => {
  const { isDark } = useTheme();
  const priority  = card.priority || "none";
  const cfg       = PRIORITY_CONFIG[priority];
  const overdue   = isOverdue(card.dueDate);
  const nearDue   = isNearDue(card.dueDate);
  const isTemp    = card._isOptimistic; // newly added card before server confirms

  return (
    <Draggable draggableId={card._id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className="group relative rounded-xl cursor-pointer animate-fade-in overflow-hidden"
          style={{
            ...provided.draggableProps.style,
            background: isDark ? "rgba(15,23,42,0.70)" : "#ffffff",
            border: snapshot.isDragging
              ? "1px solid rgba(124,58,237,0.50)"
              : isPending || isTemp
                ? "1px solid rgba(124,58,237,0.40)"
                : isDark
                  ? "1px solid rgba(255,255,255,0.07)"
                  : "1px solid rgba(0,0,0,0.07)",
            backdropFilter: isDark ? "blur(8px)" : "none",
            WebkitBackdropFilter: isDark ? "blur(8px)" : "none",
            boxShadow: snapshot.isDragging
              ? isDark
                ? "0 20px 50px rgba(0,0,0,0.55), 0 0 0 1.5px rgba(124,58,237,0.40)"
                : "0 16px 40px rgba(0,0,0,0.18), 0 0 0 1.5px rgba(124,58,237,0.25)"
              : isDark
                ? "0 2px 12px rgba(0,0,0,0.25)"
                : "0 1px 3px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.05)",
            transform: snapshot.isDragging
              ? `${provided.draggableProps.style?.transform ?? ""} rotate(2deg) scale(1.02)`
              : provided.draggableProps.style?.transform,
            opacity: snapshot.isDragging ? 0.95 : isTemp ? 0.75 : 1,
            transition: snapshot.isDragging
              ? "box-shadow 0.15s, border-color 0.15s"
              : "box-shadow 0.2s, border-color 0.2s, transform 0.15s, opacity 0.2s",
            zIndex: snapshot.isDragging ? 9999 : undefined,
          }}
          onClick={onClick}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && onClick?.()}
          onMouseEnter={(e) => {
            if (snapshot.isDragging) return;
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.boxShadow = isDark
              ? `0 8px 30px rgba(0,0,0,0.40), 0 0 0 1px rgba(124,58,237,0.20)${cfg ? `, ${cfg.glow}` : ""}`
              : `0 8px 24px rgba(0,0,0,0.10), 0 0 0 1px rgba(124,58,237,0.15)${cfg ? `, ${cfg.glow}` : ""}`;
            e.currentTarget.style.borderColor = isDark ? "rgba(255,255,255,0.12)" : "rgba(124,58,237,0.20)";
          }}
          onMouseLeave={(e) => {
            if (snapshot.isDragging) return;
            e.currentTarget.style.transform = "";
            e.currentTarget.style.boxShadow = isDark
              ? "0 2px 12px rgba(0,0,0,0.25)"
              : "0 1px 3px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.05)";
            e.currentTarget.style.borderColor = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)";
          }}
        >
          {/* Optimistic shimmer overlay */}
          {(isPending || isTemp) && !snapshot.isDragging && (
            <div
              className="card-optimistic-shimmer"
              style={{
                position: "absolute", inset: 0, zIndex: 10,
                borderRadius: "inherit", pointerEvents: "none",
                background: "linear-gradient(90deg, transparent 0%, rgba(124,58,237,0.06) 50%, transparent 100%)",
                animation: "shimmer 1.6s ease-in-out infinite",
              }}
            />
          )}

          {/* Drag handle */}
          <button
            {...provided.dragHandleProps}
            aria-label="Drag card"
            onClick={(e) => e.stopPropagation()}
            className="absolute top-2 right-2 p-0.5 rounded opacity-0 group-hover:opacity-40
              hover:!opacity-80 transition-opacity cursor-grab active:cursor-grabbing z-10"
            style={{ color: isDark ? "#fff" : "#374151", touchAction: "none" }}
            tabIndex={-1}
          >
            <GripVertical size={12} />
          </button>

          {/* Cover color strip */}
          {card.coverColor && (
            <div className="h-1.5 w-full"
              style={{ background: `linear-gradient(90deg, ${card.coverColor}, ${card.coverColor}88)` }} />
          )}

          <div className="p-3">
            {/* Labels */}
            {card.labels?.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {card.labels.slice(0, 4).map((label, i) => (
                  <span key={i} className="h-1.5 w-7 rounded-full opacity-90"
                    style={{ backgroundColor: label || "#7c3aed" }} />
                ))}
              </div>
            )}

            {/* Title */}
            <p className={`text-sm font-medium leading-snug mb-2.5 group-hover:text-violet-600 transition-colors ${card.coverColor ? "mt-1" : ""}`}
              style={{ color: isDark ? "rgba(255,255,255,0.90)" : "#111827" }}>
              {card.title}
              {isTemp && (
                <span style={{ fontSize: "10px", marginLeft: "6px", color: "#a78bfa", fontWeight: 400 }}>
                  syncing…
                </span>
              )}
            </p>

            {/* Chips row */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {cfg && (
                <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${cfg.classes}`}
                  style={{ boxShadow: cfg.glow }}>
                  <Flag size={8} />{cfg.label}
                </span>
              )}
              {card.dueDate && (
                <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border transition-colors ${
                  overdue ? "bg-red-500/20 text-red-500 border-red-500/25"
                    : nearDue ? "bg-amber-500/20 text-amber-600 border-amber-500/25"
                    : isDark ? "border-white/10 bg-white/8" : "border-slate-200 bg-slate-100"
                }`}
                  style={!overdue && !nearDue ? { color: isDark ? "rgba(255,255,255,0.40)" : "#6b7280" } : {}}>
                  <Clock size={8} />{formatDate(card.dueDate)}{overdue && " ⚠"}
                </span>
              )}
              <span className="flex-1" />
              {card.assignees?.length > 0 && (
                <div className="flex -space-x-1.5">
                  {card.assignees.slice(0, 3).map((user) =>
                    user?.avatar ? (
                      <img key={user._id} src={user.avatar} alt={user.name}
                        className="w-5 h-5 rounded-full border border-slate-900 object-cover" />
                    ) : (
                      <div key={user._id || user}
                        className="w-5 h-5 rounded-full border border-slate-900 flex items-center justify-center text-[8px] font-bold text-white"
                        style={{ background: `linear-gradient(135deg, ${user?.avatarColor || "#7c3aed"}, ${user?.avatarColor || "#4f46e5"})` }}
                        title={user?.name}>
                        {user?.name?.[0]?.toUpperCase() || "?"}
                      </div>
                    )
                  )}
                  {card.assignees.length > 3 && (
                    <div className="w-5 h-5 rounded-full border border-slate-900 bg-slate-700 flex items-center justify-center text-[8px] text-slate-400">
                      +{card.assignees.length - 3}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
};

export default CardItem;
