/**
 * pages/NotificationsPage.jsx
 *
 * Full-page notification inbox with:
 *   • All / Unread tabs
 *   • Date grouping (Today, Yesterday, This Week, Earlier)
 *   • Bulk mark-all-read
 *   • Per-row mark-read + delete actions
 */

import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell, CheckCheck, Trash2, Check, Inbox,
  UserPlus, MessageSquare, ArrowRight, Calendar, AlertCircle,
  Filter,
} from "lucide-react";
import { useNotifications } from "../context/NotificationContext";

// ── Helpers ───────────────────────────────────────────────────────────────────
const timeAgo = (dateStr) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60)  return "just now";
  const m = Math.floor(s / 60);
  if (m < 60)  return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7)   return `${d}d ago`;
  return new Date(dateStr).toLocaleDateString();
};

const groupByDate = (notifications) => {
  const now      = new Date();
  const today    = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  const weekAgo   = new Date(today); weekAgo.setDate(today.getDate() - 7);

  const groups = { Today: [], Yesterday: [], "This Week": [], Earlier: [] };

  notifications.forEach((n) => {
    const d = new Date(n.createdAt);
    if (d >= today)          groups.Today.push(n);
    else if (d >= yesterday) groups.Yesterday.push(n);
    else if (d >= weekAgo)   groups["This Week"].push(n);
    else                     groups.Earlier.push(n);
  });

  return groups;
};

const TYPE_META = {
  card_assigned: { icon: UserPlus,      color: "#8b5cf6", label: "Assignment" },
  card_comment:  { icon: MessageSquare, color: "#3b82f6", label: "Comment" },
  card_due_soon: { icon: Calendar,      color: "#f97316", label: "Due soon" },
  card_moved:    { icon: ArrowRight,    color: "#14b8a6", label: "Card moved" },
  board_invite:  { icon: Bell,          color: "#ec4899", label: "Invite" },
  mention:       { icon: AlertCircle,   color: "#eab308", label: "Mention" },
};

// ── Notification Row ──────────────────────────────────────────────────────────
const NotifRow = ({ notif, onRead, onDelete, onNavigate }) => {
  const meta   = TYPE_META[notif.type] || TYPE_META.card_comment;
  const Icon   = meta.icon;
  const actor  = notif.actor;
  const initials = actor?.name
    ? actor.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
    : "?";

  return (
    <div
      className={`group relative flex items-start gap-4 p-4 rounded-2xl cursor-pointer
        transition-all duration-150 border
        ${!notif.isRead
          ? "bg-violet-500/5 border-violet-500/20 hover:bg-violet-500/10"
          : "bg-slate-900/50 border-slate-800/40 hover:bg-slate-800/40"}`}
      onClick={() => {
        if (!notif.isRead) onRead(notif._id);
        if (notif.link) onNavigate(notif.link);
      }}
    >
      {/* Avatar + type badge */}
      <div className="relative flex-shrink-0">
        {actor ? (
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold
              text-white ring-2 ring-slate-800"
            style={{ background: `linear-gradient(135deg, ${actor.avatarColor || "#7c3aed"}, ${actor.avatarColor || "#4f46e5"}88)` }}
          >
            {initials}
          </div>
        ) : (
          <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center">
            <Icon size={18} style={{ color: meta.color }} />
          </div>
        )}
        {actor && (
          <div
            className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full
              flex items-center justify-center ring-2 ring-slate-950"
            style={{ background: meta.color }}
          >
            <Icon size={9} className="text-white" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-sm leading-relaxed ${notif.isRead ? "text-slate-400" : "text-slate-100 font-medium"}`}>
            {notif.message}
          </p>
          {!notif.isRead && (
            <div className="w-2.5 h-2.5 rounded-full bg-violet-500 flex-shrink-0 mt-1" />
          )}
        </div>
        <div className="flex items-center gap-3 mt-1.5">
          <span
            className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
            style={{ color: meta.color, background: `${meta.color}18` }}
          >
            {meta.label}
          </span>
          {notif.board?.title && (
            <span className="text-[10px] text-slate-600">{notif.board.title}</span>
          )}
          <span className="text-[10px] text-slate-600 ml-auto">{timeAgo(notif.createdAt)}</span>
        </div>
      </div>

      {/* Hover actions */}
      <div className="absolute right-3 top-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {!notif.isRead && (
          <button
            onClick={(e) => { e.stopPropagation(); onRead(notif._id); }}
            title="Mark as read"
            className="p-1.5 rounded-lg text-slate-500 hover:text-violet-400
              hover:bg-violet-500/15 transition-all"
          >
            <Check size={13} />
          </button>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(notif._id); }}
          title="Delete"
          className="p-1.5 rounded-lg text-slate-500 hover:text-red-400
            hover:bg-red-500/10 transition-all"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
};

// ── Date group ────────────────────────────────────────────────────────────────
const DateGroup = ({ label, items, ...rowProps }) => (
  <section className="mb-6">
    <h2 className="text-xs font-bold uppercase tracking-widest text-slate-600 mb-3 px-1">
      {label}
    </h2>
    <div className="space-y-2">
      {items.map((n) => (
        <NotifRow key={n._id} notif={n} {...rowProps} />
      ))}
    </div>
  </section>
);

// ── Page ──────────────────────────────────────────────────────────────────────
const NotificationsPage = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState("all"); // "all" | "unread"

  const {
    notifications, unreadCount, loading, fetched,
    fetchNotifications, markRead, markAllRead, deleteNotification,
  } = useNotifications();

  useEffect(() => {
    fetchNotifications({ unread: tab === "unread" });
  }, [tab]);

  const displayed = useMemo(() => {
    return tab === "unread"
      ? notifications.filter((n) => !n.isRead)
      : notifications;
  }, [notifications, tab]);

  const groups = useMemo(() => groupByDate(displayed), [displayed]);
  const hasAny = displayed.length > 0;

  return (
    <div className="min-h-full bg-slate-950 px-6 py-8 max-w-3xl mx-auto">

      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5 mb-1">
            <Bell size={22} className="text-violet-400" />
            Notifications
          </h1>
          <p className="text-slate-500 text-sm">
            {unreadCount > 0
              ? `You have ${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}`
              : "You're all caught up"}
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium
              text-violet-300 bg-violet-500/10 hover:bg-violet-500/20
              border border-violet-500/20 transition-all"
          >
            <CheckCheck size={15} />
            Mark all read
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 bg-slate-900/60 rounded-xl p-1 w-fit border border-slate-800/40">
        {[
          { id: "all",    label: "All" },
          { id: "unread", label: "Unread" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              tab === t.id
                ? "bg-violet-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {t.label}
            {t.id === "unread" && unreadCount > 0 && (
              <span className="ml-1.5 text-[10px] font-bold bg-white/20 px-1.5 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
        </div>
      )}

      {/* Empty state */}
      {!loading && !hasAny && (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
          <div className="w-20 h-20 rounded-3xl bg-slate-800/60 flex items-center justify-center
            border border-slate-700/40">
            <Inbox size={32} className="text-slate-600" />
          </div>
          <div>
            <p className="text-white font-semibold text-lg mb-1">
              {tab === "unread" ? "No unread notifications" : "No notifications yet"}
            </p>
            <p className="text-slate-600 text-sm max-w-xs">
              {tab === "unread"
                ? "You've read everything. Great job staying on top of things!"
                : "When teammates assign cards, comment, or mention you, it'll show up here."}
            </p>
          </div>
          {tab === "unread" && notifications.length > 0 && (
            <button
              onClick={() => setTab("all")}
              className="text-sm text-violet-400 hover:text-violet-300 transition-colors"
            >
              View all notifications
            </button>
          )}
        </div>
      )}

      {/* Grouped notifications */}
      {!loading && hasAny && (
        <>
          {Object.entries(groups).map(([label, items]) =>
            items.length > 0 ? (
              <DateGroup
                key={label}
                label={label}
                items={items}
                onRead={markRead}
                onDelete={deleteNotification}
                onNavigate={(link) => navigate(link)}
              />
            ) : null
          )}
        </>
      )}
    </div>
  );
};

export default NotificationsPage;
