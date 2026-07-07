import React, { useState } from "react";
import {
  Bell, Check, Trash2, CheckCheck, LayoutList,
  Shield, MessageSquare, Trello, Clock, UserCheck,
  AlertCircle, Loader2, RefreshCw,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "../context/NotificationContext";

// ─── Notification type icon map ───────────────────────────────────────────────
const TYPE_CONFIG = {
  card_assigned: { icon: UserCheck,     color: "#6366f1", label: "Assignment" },
  comment_added: { icon: MessageSquare, color: "#14b8a6", label: "Comment" },
  mention:       { icon: MessageSquare, color: "#22c55e", label: "Mention" },
  board_invite:  { icon: Trello,        color: "#3b82f6", label: "Board Invite" },
  role_change:   { icon: Shield,        color: "#f59e0b", label: "Role Change" },
  card_due_soon: { icon: Clock,         color: "#ef4444", label: "Due Soon" },
  card_moved:    { icon: LayoutList,    color: "#8b5cf6", label: "Moved" },
  general:       { icon: Bell,          color: "#8b5cf6", label: "General" },
};

const formatTime = (dateStr) => {
  const date = new Date(dateStr);
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

// ─── Single notification row ──────────────────────────────────────────────────
const NotifRow = ({ notif, onRead, onDelete, onNavigate }) => {
  const cfg = TYPE_CONFIG[notif.type] || TYPE_CONFIG.general;
  const Icon = cfg.icon;

  return (
    <div
      onClick={() => {
        if (!notif.read) onRead(notif._id);
        if (notif.link) onNavigate(notif.link);
      }}
      style={{
        display: "flex", gap: 14, padding: "16px",
        borderRadius: "var(--radius-lg)",
        background: notif.read ? "var(--bg-card)" : "var(--bg-surface)",
        border: `1.5px solid ${notif.read ? "var(--border-subtle)" : cfg.color + "55"}`,
        boxShadow: notif.read ? "none" : `0 0 0 1px ${cfg.color}22`,
        transition: "all var(--duration-fast)",
        cursor: notif.link ? "pointer" : "default",
        position: "relative", overflow: "hidden",
      }}
      onMouseEnter={e => e.currentTarget.style.background = "var(--bg-hover)"}
      onMouseLeave={e => e.currentTarget.style.background = notif.read ? "var(--bg-card)" : "var(--bg-surface)"}
    >
      {/* Unread indicator bar */}
      {!notif.read && (
        <div style={{
          position: "absolute", left: 0, top: 0, bottom: 0, width: 3,
          background: cfg.color, borderRadius: "4px 0 0 4px",
        }} />
      )}

      {/* Actor avatar */}
      <div style={{
        width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
        backgroundColor: notif.actor?.avatarColor || cfg.color,
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "#fff", fontWeight: 700, fontSize: 15,
      }}>
        {notif.actor?.name?.[0]?.toUpperCase() || "?"}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
          {/* Type chip */}
          <div style={{
            display: "flex", alignItems: "center", gap: 4,
            padding: "2px 8px", borderRadius: 20, flexShrink: 0,
            background: cfg.color + "18", border: `1px solid ${cfg.color}30`,
          }}>
            <Icon size={11} style={{ color: cfg.color }} />
            <span style={{ fontSize: 10, fontWeight: 700, color: cfg.color, textTransform: "uppercase", letterSpacing: ".05em" }}>
              {cfg.label}
            </span>
          </div>
          <span style={{ fontSize: 11, color: "var(--text-tertiary)", marginLeft: "auto", flexShrink: 0 }}>
            {formatTime(notif.createdAt)}
          </span>
        </div>
        <p style={{ fontSize: 13, fontWeight: notif.read ? 400 : 600, color: notif.read ? "var(--text-secondary)" : "var(--text-primary)", margin: 0, lineHeight: 1.5 }}>
          {notif.message}
        </p>
        {notif.meta?.cardTitle && (
          <p style={{ fontSize: 11, color: "var(--text-tertiary)", margin: "3px 0 0", display: "flex", alignItems: "center", gap: 4 }}>
            <LayoutList size={10} /> {notif.meta.cardTitle}
          </p>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6, justifyContent: "center", flexShrink: 0 }}
           onClick={e => e.stopPropagation()}>
        {!notif.read && (
          <button
            id={`notif-read-${notif._id}`}
            onClick={() => onRead(notif._id)}
            title="Mark as read"
            style={{ background: "transparent", border: "none", cursor: "pointer", color: cfg.color, padding: 5, display: "flex", borderRadius: "var(--radius-sm)" }}
            onMouseEnter={e => e.currentTarget.style.background = "var(--bg-hover)"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
          >
            <Check size={14} />
          </button>
        )}
        <button
          id={`notif-delete-${notif._id}`}
          onClick={() => onDelete(notif._id)}
          title="Delete"
          style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text-tertiary)", padding: 5, display: "flex", borderRadius: "var(--radius-sm)", transition: "color var(--duration-fast)" }}
          onMouseEnter={e => { e.currentTarget.style.background = "var(--bg-hover)"; e.currentTarget.style.color = "#ef4444"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-tertiary)"; }}
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
};

// ─── Tabs config ──────────────────────────────────────────────────────────────
const TABS = ["all", "unread", "mentions"];

// ─── Main Page ────────────────────────────────────────────────────────────────
const NotificationsPage = () => {
  const navigate = useNavigate();
  const {
    notifications, unreadCount, loading,
    pagination, markAsRead, markAllAsRead,
    deleteNotification, clearAll, loadMore,
    fetchNotifications,
  } = useNotifications();

  const [activeTab, setActiveTab] = useState("all");

  const filteredNotifications = notifications.filter((n) => {
    if (activeTab === "unread") return !n.read;
    if (activeTab === "mentions") return n.type === "mention";
    return true;
  });

  const mentionsCount = notifications.filter((n) => n.type === "mention" && !n.read).length;

  const tabCounts = {
    all: notifications.length,
    unread: unreadCount,
    mentions: mentionsCount,
  };

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "36px 24px" }}>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--text-primary)", marginBottom: 4 }}>
            Notifications
          </h1>
          <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
            {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}` : "You're all caught up!"}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {/* Refresh */}
          <button
            id="notif-refresh-btn"
            onClick={() => fetchNotifications(1, true)}
            title="Refresh"
            style={{
              background: "transparent", border: "1px solid var(--border-default)",
              color: "var(--text-secondary)", fontSize: 13, fontWeight: 600,
              cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
              padding: "7px 12px", borderRadius: "var(--radius-md)",
              transition: "all var(--duration-fast)",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "var(--bg-hover)"; e.currentTarget.style.color = "var(--text-primary)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-secondary)"; }}
          >
            <RefreshCw size={13} />
            Refresh
          </button>
          {/* Mark all read */}
          {unreadCount > 0 && (
            <button
              id="notif-mark-all-btn"
              onClick={markAllAsRead}
              style={{
                background: "transparent", border: "none",
                color: "var(--brand-500)", fontSize: 13, fontWeight: 600,
                cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
                padding: "7px 12px", borderRadius: "var(--radius-md)",
                transition: "background var(--duration-fast)",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--bg-hover)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              <CheckCheck size={14} />
              Mark all read
            </button>
          )}
          {/* Clear all */}
          {notifications.length > 0 && (
            <button
              id="notif-clear-all-btn"
              onClick={clearAll}
              style={{
                background: "transparent", border: "none",
                color: "var(--text-tertiary)", fontSize: 13, fontWeight: 600,
                cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
                padding: "7px 12px", borderRadius: "var(--radius-md)",
                transition: "all var(--duration-fast)",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "var(--bg-hover)"; e.currentTarget.style.color = "#ef4444"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-tertiary)"; }}
            >
              <Trash2 size={13} />
              Clear all
            </button>
          )}
        </div>
      </div>

      {/* ── Tabs ───────────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 4, borderBottom: "1px solid var(--border-subtle)", marginBottom: 20, paddingBottom: 2 }}>
        {TABS.map((tab) => (
          <button
            key={tab}
            id={`notif-tab-${tab}`}
            onClick={() => setActiveTab(tab)}
            style={{
              position: "relative", padding: "9px 16px",
              background: "transparent", border: "none",
              color: activeTab === tab ? "var(--text-primary)" : "var(--text-secondary)",
              fontWeight: activeTab === tab ? 700 : 500,
              fontSize: 14, cursor: "pointer",
              textTransform: "capitalize",
              display: "flex", alignItems: "center", gap: 6,
              transition: "color var(--duration-fast)",
            }}
          >
            {tab}
            {tabCounts[tab] > 0 && (
              <span style={{
                fontSize: 11, fontWeight: 700, padding: "1px 6px",
                borderRadius: 10, minWidth: 20, textAlign: "center",
                background: activeTab === tab ? "var(--brand-500)" : "var(--bg-hover)",
                color: activeTab === tab ? "#fff" : "var(--text-secondary)",
              }}>
                {tabCounts[tab]}
              </span>
            )}
            {activeTab === tab && (
              <div style={{
                position: "absolute", bottom: -3, left: 0, right: 0,
                height: 2, background: "var(--brand-500)", borderRadius: 2,
              }} />
            )}
          </button>
        ))}
      </div>

      {/* ── Loading ─────────────────────────────────────────────────────────── */}
      {loading && notifications.length === 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="skeleton" style={{ height: 88, borderRadius: "var(--radius-lg)" }} />
          ))}
        </div>
      )}

      {/* ── Empty state ─────────────────────────────────────────────────────── */}
      {!loading && filteredNotifications.length === 0 && (
        <div style={{ textAlign: "center", padding: "64px 0" }}>
          <div style={{
            width: 72, height: 72, borderRadius: "var(--radius-xl)",
            background: "var(--bg-card)", border: "1px solid var(--border-subtle)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 16px", fontSize: 28, color: "var(--text-tertiary)",
          }}>
            🔔
          </div>
          <p style={{ fontSize: 15, color: "var(--text-secondary)", fontWeight: 600 }}>
            {activeTab === "all" ? "No notifications yet" : `No ${activeTab} notifications`}
          </p>
          <p style={{ fontSize: 13, color: "var(--text-tertiary)", marginTop: 4 }}>
            {activeTab === "all"
              ? "Notifications for assignments, comments and mentions will appear here"
              : "Check back later"}
          </p>
        </div>
      )}

      {/* ── Notification list ───────────────────────────────────────────────── */}
      {filteredNotifications.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filteredNotifications.map((notif) => (
            <NotifRow
              key={notif._id}
              notif={notif}
              onRead={markAsRead}
              onDelete={deleteNotification}
              onNavigate={navigate}
            />
          ))}
        </div>
      )}

      {/* ── Load more ──────────────────────────────────────────────────────── */}
      {pagination.hasMore && activeTab === "all" && (
        <div style={{ textAlign: "center", marginTop: 20 }}>
          <button
            id="notif-load-more-btn"
            onClick={loadMore}
            disabled={loading}
            style={{
              padding: "10px 24px", borderRadius: "var(--radius-md)",
              background: "var(--bg-card)", border: "1px solid var(--border-default)",
              color: "var(--text-secondary)", fontSize: 13, fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              display: "inline-flex", alignItems: "center", gap: 8,
              transition: "all var(--duration-fast)",
            }}
            onMouseEnter={e => !loading && (e.currentTarget.style.background = "var(--bg-hover)")}
            onMouseLeave={e => (e.currentTarget.style.background = "var(--bg-card)")}
          >
            {loading && <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />}
            Load more ({pagination.total - notifications.length} remaining)
          </button>
        </div>
      )}
    </div>
  );
};

export default NotificationsPage;
