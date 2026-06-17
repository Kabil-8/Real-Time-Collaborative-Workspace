import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import {
  LayoutDashboard, Trello, Bell, Search, Settings,
  ChevronDown, Plus, LogOut, User, Hash,
  ChevronLeft, ChevronRight
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useWorkspace } from "../../context/WorkspaceContext";
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
  <Link to={to}
    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150
      ${active
        ? "bg-violet-500/15 text-violet-300 shadow-sm"
        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
      }`}
  >
    <Icon size={17} className="flex-shrink-0" />
    <span className="flex-1">{label}</span>
    {badge != null && (
      <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-violet-500/20 text-violet-300 text-xs flex items-center justify-center">
        {badge}
      </span>
    )}
  </Link>
);

const WorkspaceSwitcher = ({ onCreateClick }) => {
  const { workspaces, activeWorkspace, selectWorkspace } = useWorkspace();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-800
          border border-slate-700/50 transition-all duration-150 group"
      >
        <span className="text-xl leading-none">{activeWorkspace?.icon || "🏢"}</span>
        <div className="flex-1 min-w-0 text-left">
          <p className="text-sm font-semibold text-white truncate leading-tight">
            {activeWorkspace?.name || "Select workspace"}
          </p>
          <p className="text-xs text-slate-500 leading-tight">
            {activeWorkspace?.members?.length || 0} members
          </p>
        </div>
        <ChevronDown size={14} className={`text-slate-500 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-slate-900 border border-slate-700
          rounded-xl shadow-2xl shadow-black/40 z-50 overflow-hidden">
          <div className="p-1.5 max-h-52 overflow-y-auto">
            {workspaces.map((ws) => (
              <button
                key={ws._id}
                onClick={() => { selectWorkspace(ws); setOpen(false); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors
                  ${activeWorkspace?._id === ws._id
                    ? "bg-violet-500/15 text-violet-300"
                    : "text-slate-300 hover:bg-slate-800"
                  }`}
              >
                <span className="text-base">{ws.icon}</span>
                <span className="truncate font-medium">{ws.name}</span>
              </button>
            ))}
          </div>
          <div className="border-t border-slate-800 p-1.5">
            <button
              onClick={() => { onCreateClick(); setOpen(false); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-slate-400
                hover:text-slate-200 hover:bg-slate-800 transition-colors"
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
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + "/");

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  if (collapsed) {
    return (
      <aside className="w-16 h-screen flex flex-col bg-slate-950 border-r border-slate-800/50 py-4 items-center gap-2">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600
          flex items-center justify-center text-white font-bold text-lg mb-2 shadow-lg shadow-violet-500/20">
          Z
        </div>
        <button onClick={onToggleCollapse}
          className="p-2 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors">
          <ChevronRight size={16} />
        </button>
      </aside>
    );
  }

  return (
    <aside className="w-64 h-screen flex flex-col bg-slate-950 border-r border-slate-800/50 flex-shrink-0">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 py-4 border-b border-slate-800/50">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600
          flex items-center justify-center text-white font-bold shadow-lg shadow-violet-500/20 flex-shrink-0">
          Z
        </div>
        <span className="text-white font-bold tracking-tight text-lg flex-1">Zaalima</span>
        <button onClick={onToggleCollapse}
          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors">
          <ChevronLeft size={15} />
        </button>
      </div>

      {/* Workspace switcher */}
      <div className="px-3 py-3 border-b border-slate-800/50">
        <WorkspaceSwitcher onCreateClick={onCreateWorkspace} />
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        <NavItem icon={LayoutDashboard} label="Home" to="/" active={location.pathname === "/"} />
        <NavItem icon={Search} label="Search" to="/search" active={isActive("/search")} />
        <NavItem icon={Bell} label="Notifications" to="/notifications" active={isActive("/notifications")} badge={3} />

        {activeWorkspace && (
          <>
            <div className="pt-4 pb-1.5">
              <p className="px-3 text-[11px] font-semibold uppercase tracking-widest text-slate-600">
                Workspace
              </p>
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

      {/* User profile footer */}
      <div className="px-3 py-3 border-t border-slate-800/50">
        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-slate-800/60 transition-colors group cursor-pointer">
          <Avatar user={user} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.name}</p>
            <p className="text-xs text-slate-500 truncate">{user?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-500
              hover:text-red-400 hover:bg-red-500/10 transition-all"
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
