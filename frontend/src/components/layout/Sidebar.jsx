import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import {
  LayoutDashboard, Trello, Bell, Search, Settings,
  ChevronDown, Plus, LogOut, User, Hash,
  ChevronLeft, ChevronRight, Sun, Moon
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useWorkspace } from "../../context/WorkspaceContext";
import { useTheme } from "../../context/ThemeContext";
import { useNotifications } from "../../context/NotificationContext";

export const Avatar = ({ user, size = "sm" }) => {
  const sizes = { sm: "w-7 h-7 text-xs", md: "w-9 h-9 text-sm", lg: "w-11 h-11 text-base" };
  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
    : "?";

  if (user?.avatar) {
    return (
      <img src={user.avatar} alt={user.name}
        className={`${sizes[size]} rounded-full object-cover flex-shrink-0`} />
    );
  }
  return (
    <div
      className={`${sizes[size]} rounded-full flex items-center justify-center font-semibold text-white flex-shrink-0`}
      style={{ backgroundColor: user?.avatarColor || "#6366f1" }}
    >
      {initials}
    </div>
  );
};

const NavItem = ({ icon: Icon, label, to, active, badge }) => (
  <Link
    to={to}
    style={{
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "9px 12px",
      borderRadius: "var(--radius-md)",
      fontSize: 14,
      fontWeight: 500,
      textDecoration: "none",
      transition: "background var(--duration-fast), color var(--duration-fast)",
      background: active ? "rgba(124, 58, 237, 0.12)" : "transparent",
      color: active ? "var(--text-brand)" : "var(--text-secondary)",
    }}
    onMouseEnter={e => {
      if (!active) {
        e.currentTarget.style.background = "var(--bg-surface-3)";
        e.currentTarget.style.color = "var(--text-primary)";
      }
    }}
    onMouseLeave={e => {
      if (!active) {
        e.currentTarget.style.background = "transparent";
        e.currentTarget.style.color = "var(--text-secondary)";
      }
    }}
  >
    <Icon size={17} style={{ flexShrink: 0 }} />
    <span style={{ flex: 1 }}>{label}</span>
    {badge != null && (
      <span
        style={{
          minWidth: 20,
          height: 20,
          padding: "0 6px",
          borderRadius: 999,
          background: active ? "rgba(124,58,237,0.20)" : "var(--bg-surface-4)",
          color: active ? "var(--text-brand)" : "var(--text-tertiary)",
          fontSize: 11,
          fontWeight: 700,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {badge}
      </span>
    )}
  </Link>
);

const WorkspaceSwitcher = ({ onCreateClick }) => {
  const { workspaces, activeWorkspace, selectWorkspace } = useWorkspace();
  const [open, setOpen] = useState(false);

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 12px",
          borderRadius: "var(--radius-lg)",
          background: "var(--bg-surface-2)",
          border: "1px solid var(--border-default)",
          cursor: "pointer",
          transition: "background var(--duration-fast), border-color var(--duration-fast)",
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = "var(--bg-surface-3)";
          e.currentTarget.style.borderColor = "var(--border-strong)";
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = "var(--bg-surface-2)";
          e.currentTarget.style.borderColor = "var(--border-default)";
        }}
      >
        <span style={{ fontSize: 20, lineHeight: 1 }}>{activeWorkspace?.icon || "🏢"}</span>
        <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
          <p style={{
            fontSize: 13, fontWeight: 600, color: "var(--text-primary)",
            margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {activeWorkspace?.name || "Select workspace"}
          </p>
          <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0 }}>
            {activeWorkspace?.members?.length || 0} members
          </p>
        </div>
        <ChevronDown
          size={14}
          style={{
            color: "var(--text-muted)",
            transition: "transform 0.2s",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            flexShrink: 0,
          }}
        />
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            right: 0,
            background: "var(--bg-elevated)",
            border: "1px solid var(--border-default)",
            borderRadius: "var(--radius-lg)",
            boxShadow: "var(--shadow-lg)",
            zIndex: 50,
            overflow: "hidden",
          }}
        >
          <div style={{ padding: 6, maxHeight: 208, overflowY: "auto" }}>
            {workspaces.map((ws) => (
              <button
                key={ws._id}
                onClick={() => { selectWorkspace(ws); setOpen(false); }}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 12px",
                  borderRadius: "var(--radius-md)",
                  fontSize: 13,
                  fontWeight: 500,
                  border: "none",
                  cursor: "pointer",
                  transition: "background var(--duration-fast)",
                  background: activeWorkspace?._id === ws._id
                    ? "rgba(124,58,237,0.12)"
                    : "transparent",
                  color: activeWorkspace?._id === ws._id
                    ? "var(--text-brand)"
                    : "var(--text-secondary)",
                }}
                onMouseEnter={e => {
                  if (activeWorkspace?._id !== ws._id) {
                    e.currentTarget.style.background = "var(--bg-surface-3)";
                    e.currentTarget.style.color = "var(--text-primary)";
                  }
                }}
                onMouseLeave={e => {
                  if (activeWorkspace?._id !== ws._id) {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "var(--text-secondary)";
                  }
                }}
              >
                <span style={{ fontSize: 16 }}>{ws.icon}</span>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {ws.name}
                </span>
              </button>
            ))}
          </div>
          <div style={{ borderTop: "1px solid var(--border-subtle)", padding: 6 }}>
            <button
              onClick={() => { onCreateClick(); setOpen(false); }}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 12px",
                borderRadius: "var(--radius-md)",
                fontSize: 13,
                fontWeight: 500,
                border: "none",
                cursor: "pointer",
                background: "transparent",
                color: "var(--text-tertiary)",
                transition: "background var(--duration-fast), color var(--duration-fast)",
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = "var(--bg-surface-3)";
                e.currentTarget.style.color = "var(--text-primary)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "var(--text-tertiary)";
              }}
            >
              <Plus size={15} />
              <span>New workspace</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const Sidebar = ({ onCreateWorkspace, collapsed, onToggleCollapse }) => {
  const { user, logout } = useAuth();
  const { activeWorkspace } = useWorkspace();
  const { toggleTheme, isDark } = useTheme();
  const { unreadCount } = useNotifications();
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + "/");

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  if (collapsed) {
    return (
      <aside
        className="sidebar-bg"
        style={{
          width: 64, height: "100vh", display: "flex", flexDirection: "column",
          background: "var(--bg-surface)", borderRight: "1px solid var(--border-subtle)",
          padding: "16px 0", alignItems: "center", gap: 8, flexShrink: 0,
          transition: "background var(--transition-slow)",
        }}
      >
        <div style={{
          width: 36, height: 36, borderRadius: 12,
          background: "linear-gradient(135deg, #8b5cf6, #6366f1)",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#fff", fontWeight: 800, fontSize: 18, marginBottom: 8,
          boxShadow: "0 4px 12px rgba(139,92,246,.4)",
        }}>Z</div>
        <button className="btn-icon" onClick={onToggleCollapse}><ChevronRight size={16} /></button>
      </aside>
    );
  }

  return (
    <aside
      className="sidebar-bg"
      style={{
        width: 256, height: "100vh", display: "flex", flexDirection: "column",
        background: "var(--bg-surface)", borderRight: "1px solid var(--border-subtle)",
        flexShrink: 0, transition: "background var(--transition-slow)",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px", borderBottom: "1px solid var(--border-subtle)" }}>
        <div style={{
          width: 32, height: 32, borderRadius: 10,
          background: "linear-gradient(135deg, #8b5cf6, #6366f1)",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#fff", fontWeight: 800, fontSize: 16, flexShrink: 0,
          boxShadow: "0 4px 12px rgba(139,92,246,.4)",
        }}>Z</div>
        <span style={{ color: "var(--text-primary)", fontWeight: 800, fontSize: 18, letterSpacing: "-.02em", flex: 1 }}>Zaalima</span>
        <button className="btn-icon" onClick={onToggleCollapse}><ChevronLeft size={15} /></button>
      </div>

      {/* Workspace switcher */}
      <div style={{ padding: "12px", borderBottom: "1px solid var(--border-subtle)" }}>
        <WorkspaceSwitcher onCreateClick={onCreateWorkspace} />
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: "12px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 2 }}>
        <NavItem icon={LayoutDashboard} label="Home" to="/" active={location.pathname === "/"} />
        <NavItem icon={Search} label="Search" to="/search" active={isActive("/search")} />
        <NavItem icon={Bell} label="Notifications" to="/notifications" active={isActive("/notifications")} badge={unreadCount > 0 ? unreadCount : undefined} />

        {activeWorkspace && (
          <>
            <div style={{ paddingTop: 16, paddingBottom: 6 }}>
              <p style={{
                paddingLeft: 12, fontSize: 11, fontWeight: 700,
                textTransform: "uppercase", letterSpacing: ".08em",
                color: "var(--text-muted)",
              }}>Workspace</p>
            </div>
            <NavItem icon={Trello} label="Boards" to="/boards" active={isActive("/boards")} />
            <NavItem icon={Hash} label="Members" to={`/workspace/${activeWorkspace._id}/members`}
              active={isActive(`/workspace/${activeWorkspace._id}/members`)}
              badge={activeWorkspace.members?.length} />
            <NavItem icon={Settings} label="Settings" to={`/workspace/${activeWorkspace._id}/settings`}
              active={isActive(`/workspace/${activeWorkspace._id}/settings`)} />
          </>
        )}
      </nav>

      {/* Footer */}
      <div style={{ padding: "12px", borderTop: "1px solid var(--border-subtle)" }}>
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          style={{
            display: "flex", alignItems: "center", gap: 8, width: "100%",
            padding: "8px 12px", borderRadius: "var(--radius-md)",
            background: "transparent", border: "none",
            color: "var(--text-secondary)", fontSize: 13, fontWeight: 500,
            cursor: "pointer", marginBottom: 4,
            transition: "background var(--duration-fast), color var(--duration-fast)",
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = "var(--bg-surface-3)";
            e.currentTarget.style.color = "var(--text-primary)";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "var(--text-secondary)";
          }}
        >
          {isDark ? <Sun size={15} /> : <Moon size={15} />}
          {isDark ? "Light mode" : "Dark mode"}
        </button>

        {/* User row */}
        <div
          style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "8px 12px", borderRadius: "var(--radius-md)",
          }}
        >
          <Avatar user={user} size="sm" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{
              fontSize: 13, fontWeight: 600, color: "var(--text-primary)",
              margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>{user?.name}</p>
            <p style={{
              fontSize: 11.5, color: "var(--text-muted)",
              margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>{user?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="btn-icon"
            title="Sign out"
            style={{ color: "var(--text-muted)" }}
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
