import React, { useState } from "react";
import Sidebar from "./Sidebar";
import CreateWorkspaceModal from "../workspace/CreateWorkspaceModal";
import { useTheme } from "../../context/ThemeContext";
import { useNotifications } from "../../context/NotificationContext";
import { Bell, X } from "lucide-react";

// ─── In-app Toast for real-time notifications ─────────────────────────────────
const NotificationToast = ({ toast, onClose }) => {
  if (!toast) return null;

  return (
    <div
      style={{
        position: "fixed", bottom: 24, right: 24, zIndex: 9999,
        display: "flex", alignItems: "flex-start", gap: 12,
        padding: "14px 16px",
        background: "var(--bg-surface)",
        border: "1px solid var(--brand-500)",
        borderRadius: "var(--radius-lg)",
        boxShadow: "0 8px 32px rgba(0,0,0,.35), 0 0 0 1px rgba(139,92,246,.15)",
        maxWidth: 360, minWidth: 280,
        animation: "slideInUp 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)",
      }}
    >
      {/* Actor avatar */}
      <div style={{
        width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
        backgroundColor: toast.actor?.avatarColor || "#8b5cf6",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "#fff", fontWeight: 700, fontSize: 14,
      }}>
        {toast.actor?.name?.[0]?.toUpperCase() || <Bell size={14} />}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: "var(--brand-400)", margin: "0 0 3px", textTransform: "uppercase", letterSpacing: ".04em" }}>
          New Notification
        </p>
        <p style={{ fontSize: 13, color: "var(--text-primary)", margin: 0, lineHeight: 1.4 }}>
          {toast.message}
        </p>
      </div>

      {/* Close */}
      <button
        onClick={onClose}
        style={{
          background: "transparent", border: "none", cursor: "pointer",
          color: "var(--text-tertiary)", padding: 2, flexShrink: 0,
          display: "flex", borderRadius: "var(--radius-sm)",
        }}
      >
        <X size={14} />
      </button>
    </div>
  );
};

// ─── AppShell ─────────────────────────────────────────────────────────────────
const AppShell = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [showCreateWorkspace, setShowCreateWorkspace] = useState(false);
  const { isDark } = useTheme();
  const { toast, setToast } = useNotifications();

  return (
    <div
      className="sidebar-bg"
      style={{
        display: "flex",
        height: "100vh",
        background: "var(--bg-app)",
        overflow: "hidden",
        transition: "background var(--transition-slow)",
      }}
    >
      <Sidebar
        onCreateWorkspace={() => setShowCreateWorkspace(true)}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((c) => !c)}
      />

      {/* Main content area */}
      <main
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          minWidth: 0,
        }}
      >
        {/* Page content */}
        <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
          {children}
        </div>
      </main>

      {showCreateWorkspace && (
        <CreateWorkspaceModal onClose={() => setShowCreateWorkspace(false)} />
      )}

      {/* Real-time notification toast */}
      <NotificationToast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
};

export default AppShell;
