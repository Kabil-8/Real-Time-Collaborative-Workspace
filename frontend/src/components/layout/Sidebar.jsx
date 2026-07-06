import React, { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import {
  LayoutDashboard, Trello, Bell, Search, Settings,
  ChevronDown, Plus, LogOut, Hash, ChevronLeft, ChevronRight,
  Zap, Users
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useWorkspace } from "../../context/WorkspaceContext";
import { useNotifications } from "../../context/NotificationContext";

// ─── Avatar ───────────────────────────────────────────────────────────────────
export const Avatar = ({ user, size = "sm", online = false }) => {
  const sizes = {
    xs:  "w-6 h-6 text-[9px]",
    sm:  "w-7 h-7 text-xs",
    md:  "w-9 h-9 text-sm",
    lg:  "w-11 h-11 text-base",
    xl:  "w-14 h-14 text-lg",
  };
  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
    : "?";

  if (user?.avatar) {
    return (
      <div className="relative inline-flex flex-shrink-0">
        <img src={user.avatar} alt={user.name}
          className={`${sizes[size]} rounded-full object-cover ring-2 ring-slate-900`} />
        {online && (
          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400
            border-2 border-slate-900 animate-pulse-dot" />
        )}
      </div>
    );
  }
  return (
    <div className="relative inline-flex flex-shrink-0">
      <div
        className={`${sizes[size]} rounded-full flex items-center justify-center font-semibold text-white
          ring-2 ring-slate-900 flex-shrink-0`}
        style={{ background: `linear-gradient(135deg, ${user?.avatarColor || "#7c3aed"}, ${user?.avatarColor ? user.avatarColor + "99" : "#4f46e5"})` }}
      >
        {initials}
      </div>
      {online && (
        <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400
          border-2 border-slate-900 animate-pulse-dot" />
      )}
    </div>
  );
};

// ─── NavItem ──────────────────────────────────────────────────────────────────
const NavItem = ({ icon: Icon, label, to, active, badge, collapsed }) => (
  <Link
    to={to}
    className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
      transition-all duration-200 group
      ${active
        ? "text-white bg-violet-500/15"
        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
      }`}
    title={collapsed ? label : undefined}
  >
    {/* Active left border accent */}
    {active && (
      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full
        bg-gradient-to-b from-violet-400 to-indigo-500" />
    )}
    <Icon size={17} className={`flex-shrink-0 transition-transform duration-200
      ${active ? "text-violet-400" : "text-slate-500 group-hover:text-slate-300"}
      ${active ? "" : "group-hover:scale-105"}`} />
    {!collapsed && (
      <>
        <span className="flex-1 truncate">{label}</span>
        {badge != null && (
          <span className={`min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-bold
            flex items-center justify-center transition-all
            ${active
              ? "bg-violet-500/30 text-violet-300"
              : "bg-slate-800 text-slate-500 group-hover:bg-slate-700 group-hover:text-slate-400"
            }`}>
            {badge}
          </span>
        )}
      </>
    )}
  </Link>
);

// ─── Section label ─────────────────────────────────────────────────────────────
const SectionLabel = ({ children }) => (
  <p className="px-3 pt-4 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-600 select-none">
    {children}
  </p>
);

// ─── Workspace Switcher ───────────────────────────────────────────────────────
const WorkspaceSwitcher = ({ onCreateClick }) => {
  const { workspaces, activeWorkspace, selectWorkspace } = useWorkspace();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl
          bg-slate-800/40 hover:bg-slate-800/70 border border-slate-700/40
          transition-all duration-200 group"
      >
        {/* Workspace color dot + icon */}
        <div className="relative flex-shrink-0">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-base
              transition-transform duration-200 group-hover:scale-105"
            style={{
              background: activeWorkspace?.color
                ? `linear-gradient(135deg, ${activeWorkspace.color}, ${activeWorkspace.color}88)`
                : "linear-gradient(135deg, #7c3aed, #4f46e5)"
            }}
          >
            <span>{activeWorkspace?.icon || "🏢"}</span>
          </div>
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className="text-sm font-semibold text-white truncate leading-tight">
            {activeWorkspace?.name || "Select workspace"}
          </p>
          <p className="text-[11px] text-slate-500 leading-tight">
            {activeWorkspace?.members?.length || 0} members
          </p>
        </div>
        <ChevronDown size={13} className={`text-slate-500 transition-transform duration-200 flex-shrink-0
          ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 right-0 mt-2 glass rounded-2xl
            shadow-2xl shadow-black/60 z-50 overflow-hidden animate-scale-in">
            <div className="p-1.5 max-h-52 overflow-y-auto">
              {workspaces.map((ws) => (
                <button
                  key={ws._id}
                  onClick={() => { selectWorkspace(ws); setOpen(false); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm
                    transition-all duration-150
                    ${activeWorkspace?._id === ws._id
                      ? "bg-violet-500/15 text-violet-300"
                      : "text-slate-300 hover:bg-slate-800/60"
                    }`}
                >
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
                    style={{
                      background: ws.color
                        ? `linear-gradient(135deg, ${ws.color}, ${ws.color}88)`
                        : "linear-gradient(135deg, #7c3aed, #4f46e5)"
                    }}
                  >
                    {ws.icon}
                  </div>
                  <span className="truncate font-medium">{ws.name}</span>
                  {activeWorkspace?._id === ws._id && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-violet-400 flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>
            <div className="border-t border-slate-800/60 p-1.5">
              <button
                onClick={() => { onCreateClick(); setOpen(false); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm
                  text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-all"
              >
                <div className="w-7 h-7 rounded-lg border border-dashed border-slate-700
                  flex items-center justify-center">
                  <Plus size={13} />
                </div>
                <span>New workspace</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// ─── Sidebar ──────────────────────────────────────────────────────────────────
const Sidebar = ({ onCreateWorkspace, collapsed, onToggleCollapse }) => {
  const { user, logout } = useAuth();
  const { activeWorkspace } = useWorkspace();
  const { unreadCount } = useNotifications();
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path) =>
    location.pathname === path || location.pathname.startsWith(path + "/");

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  if (collapsed) {
    return (
      <aside className="w-16 h-screen flex flex-col bg-slate-950 border-r border-slate-800/40
        py-4 items-center gap-2 flex-shrink-0 relative">
        {/* Logo */}
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600
          flex items-center justify-center text-white font-black text-lg
          shadow-lg shadow-violet-500/30 glow-violet-sm mb-2">
          Z
        </div>
        <button onClick={onToggleCollapse}
          className="p-2 rounded-xl text-slate-500 hover:text-slate-300 hover:bg-slate-800/60
            transition-all tooltip" data-tip="Expand">
          <ChevronRight size={16} />
        </button>
        <div className="w-6 h-px bg-slate-800 my-1" />
        {/* Collapsed nav icons */}
        {[
          { icon: LayoutDashboard, to: "/", tip: "Home" },
          { icon: Trello, to: "/boards", tip: "Boards" },
        ].map(({ icon: Icon, to, tip }) => (
          <Link key={to} to={to} data-tip={tip}
            className={`p-2.5 rounded-xl transition-all tooltip
              ${isActive(to) ? "bg-violet-500/15 text-violet-400" : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/60"}`}>
            <Icon size={17} />
          </Link>
        ))}
      </aside>
    );
  }

  return (
    <aside className="w-64 h-screen flex flex-col bg-slate-950 border-r border-slate-800/40
      flex-shrink-0 relative">

      {/* Subtle gradient top bar */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-violet-500/40 via-indigo-500/20 to-transparent" />

      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 py-4 border-b border-slate-800/40">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600
          flex items-center justify-center text-white font-black shadow-md shadow-violet-500/30 flex-shrink-0">
          Z
        </div>
        <span className="text-white font-bold tracking-tight text-lg flex-1">Zaalima</span>
        <button onClick={onToggleCollapse}
          className="p-1.5 rounded-lg text-slate-600 hover:text-slate-300
            hover:bg-slate-800/60 transition-all">
          <ChevronLeft size={15} />
        </button>
      </div>

      {/* Workspace switcher */}
      <div className="px-3 py-3 border-b border-slate-800/40">
        <WorkspaceSwitcher onCreateClick={onCreateWorkspace} />
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-2 space-y-0.5 overflow-y-auto">
        <SectionLabel>General</SectionLabel>
        <NavItem icon={LayoutDashboard} label="Home" to="/" active={location.pathname === "/"} />
        <NavItem icon={Search}          label="Search"  to="/search" active={isActive("/search")} />
        <NavItem icon={Bell} label="Notifications" to="/notifications"
          active={isActive("/notifications")} badge={unreadCount || null} />

        {activeWorkspace && (
          <>
            <SectionLabel>Workspace</SectionLabel>
            <NavItem icon={Trello}   label="Boards"  to="/boards"  active={isActive("/boards")} />
            <NavItem icon={Users}    label="Members" to={`/workspace/${activeWorkspace._id}/members`}
              active={isActive(`/workspace/${activeWorkspace._id}/members`)}
              badge={activeWorkspace.members?.length} />
            <NavItem icon={Settings} label="Settings" to={`/workspace/${activeWorkspace._id}/settings`}
              active={isActive(`/workspace/${activeWorkspace._id}/settings`)} />
          </>
        )}
      </nav>

      {/* User footer */}
      <div className="px-2 py-3 border-t border-slate-800/40">
        <div className="flex items-center gap-2.5 px-2.5 py-2.5 rounded-xl
          hover:bg-slate-800/50 transition-all group cursor-pointer relative">
          <Avatar user={user} size="sm" online />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate leading-tight">{user?.name}</p>
            <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg
              text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
            title="Sign out"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
