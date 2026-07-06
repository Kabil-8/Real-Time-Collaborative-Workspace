/**
 * components/ui/NotificationPanel.jsx
 *
 * Slide-in notification panel anchored to the top-right bell button.
 * Shows paginated notifications with actor avatars, time-ago,
 * unread dots, mark-all-read, and per-notification actions.
 */

import React, { useEffect, useRef } from "react";
import { useNavigate }               from "react-router-dom";
import {
  Bell, Check, CheckCheck, Trash2, X,
  UserPlus, MessageSquare, ArrowRight, Calendar, AlertCircle,
  Inbox,
} from "lucide-react";
import { useNotifications } from "../../context/NotificationContext";

// ── Time-ago helper ──────────────────────────────────────────────────────────
const timeAgo = (dateStr) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60)       return "just now";
  const m = Math.floor(s / 60);
  if (m < 60)       return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)       return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7)        return `${d}d ago`;
  return new Date(dateStr).toLocaleDateString();
};

// ── Icon per notification type ───────────────────────────────────────────────
const TYPE_META = {
  card_assigned: { icon: UserPlus,      color: "#8b5cf6" },
  card_comment:  { icon: MessageSquare, color: "#3b82f6" },
  card_due_soon: { icon: Calendar,      color: "#f97316" },
  card_moved:    { icon: ArrowRight,    color: "#14b8a6" },
  board_invite:  { icon: Bell,          color: "#ec4899" },
  mention:       { icon: AlertCircle,   color: "#eab308" },
};

// ── Single notification row ──────────────────────────────────────────────────
const NotifRow = ({ notif, onRead, onDelete, onNavigate }) => {
  const meta = TYPE_META[notif.type] || TYPE_META.card_comment;
  const Icon = meta.icon;
  const actor = notif.actor;
  const initials = actor?.name
    ? actor.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
    : "?";

  return (
    <div
      className={`group relative flex items-start gap-3 px-4 py-3 cursor-pointer
        transition-colors duration-150 hover:bg-slate-800/50
        ${!notif.isRead ? "bg-violet-500/5 border-l-2 border-violet-500" : "border-l-2 border-transparent"}`}
      onClick={() => {
        if (!notif.isRead) onRead(notif._id);
        if (notif.link) onNavigate(notif.link);
      }}
    >
      {/* Actor avatar or type icon */}
      <div className="relative flex-shrink-0 mt-0.5">
        {actor ? (
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white ring-1 ring-slate-800"
            style={{ background: `linear-gradient(135deg, ${actor.avatarColor || "#7c3aed"}, ${actor.avatarColor || "#4f46e5"}88)` }}
          >
            {initials}
          </div>
        ) : (
          <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center">
            <Icon size={14} style={{ color: meta.color }} />
          </div>
        )}
        {/* Type icon badge */}
        {actor && (
          <div
            className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center ring-1 ring-slate-900"
            style={{ background: meta.color }}
          >
            <Icon size={8} className="text-white" />
          </div>
        )}
      </div>

      {/* Message */}
      <div className="flex-1 min-w-0">
        <p className={`text-xs leading-relaxed ${notif.isRead ? "text-slate-400" : "text-slate-200"}`}>
          {notif.message}
        </p>
        <p className="text-[10px] text-slate-600 mt-0.5">{timeAgo(notif.createdAt)}</p>
      </div>

      {/* Unread dot */}
      {!notif.isRead && (
        <div className="w-2 h-2 rounded-full bg-violet-500 flex-shrink-0 mt-1.5" />
      )}

      {/* Hover actions */}
      <div className="absolute right-3 top-2 opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
        {!notif.isRead && (
          <button
            onClick={(e) => { e.stopPropagation(); onRead(notif._id); }}
            title="Mark as read"
            className="p-1 rounded-md text-slate-500 hover:text-violet-400 hover:bg-slate-700/60 transition-all"
          >
            <Check size={11} />
          </button>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(notif._id); }}
          title="Delete"
          className="p-1 rounded-md text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
        >
          <Trash2 size={11} />
        </button>
      </div>
    </div>
  );
};

// ── Main panel ────────────────────────────────────────────────────────────────
const NotificationPanel = ({ onClose }) => {
  const navigate = useNavigate();
  const panelRef = useRef(null);
  const {
    notifications, unreadCount, loading, fetched,
    fetchNotifications, markRead, markAllRead, deleteNotification,
  } = useNotifications();

  // Load notifications when panel opens
  useEffect(() => {
    if (!fetched) fetchNotifications();
  }, [fetched, fetchNotifications]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleNavigate = (link) => {
    navigate(link);
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* Panel */}
      <div
        ref={panelRef}
        className="fixed top-14 right-4 z-50 w-96 max-h-[calc(100vh-6rem)]
          bg-slate-900 border border-slate-700/50 rounded-2xl
          shadow-2xl shadow-black/60 overflow-hidden
          flex flex-col animate-scale-in"
        style={{ transformOrigin: "top right" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5
          border-b border-slate-800/60">
          <div className="flex items-center gap-2">
            <Bell size={16} className="text-violet-400" />
            <span className="text-sm font-semibold text-white">Notifications</span>
            {unreadCount > 0 && (
              <span className="min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-bold
                bg-violet-500 text-white flex items-center justify-center">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                title="Mark all as read"
                className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs
                  text-slate-400 hover:text-violet-300 hover:bg-violet-500/10 transition-all"
              >
                <CheckCheck size={13} />
                All read
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300
                hover:bg-slate-800/60 transition-all"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Notification list */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
            </div>
          )}

          {!loading && notifications.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 gap-3 px-6 text-center">
              <div className="w-14 h-14 rounded-2xl bg-slate-800/60 flex items-center justify-center">
                <Inbox size={22} className="text-slate-600" />
              </div>
              <p className="text-slate-400 text-sm font-medium">All caught up!</p>
              <p className="text-slate-600 text-xs">No notifications yet. You'll see updates here when teammates interact with your cards.</p>
            </div>
          )}

          {!loading && notifications.map((notif) => (
            <NotifRow
              key={notif._id}
              notif={notif}
              onRead={markRead}
              onDelete={deleteNotification}
              onNavigate={handleNavigate}
            />
          ))}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-800/60 px-4 py-2.5">
          <button
            onClick={() => { navigate("/notifications"); onClose(); }}
            className="w-full text-center text-xs text-slate-500 hover:text-violet-300
              transition-colors py-1"
          >
            View all notifications
          </button>
        </div>
      </div>
    </>
  );
};

export default NotificationPanel;
