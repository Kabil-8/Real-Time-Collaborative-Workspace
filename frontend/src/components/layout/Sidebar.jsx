import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useWorkspace } from "../../context/WorkspaceContext";

export default function Sidebar({ onCreateWorkspace }) {
  const { user, logout } = useAuth();
  const { workspaces, currentId, selectWorkspace } = useWorkspace();
  const navigate = useNavigate();
  const initial = (user?.name || "?").slice(0, 1).toUpperCase();

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-slate-200/80 bg-white/85 backdrop-blur-xl">
      <div className="px-5 py-5 border-b border-slate-200/80">
        <div className="flex items-center gap-2"><div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-sm font-black text-white shadow-md">Z</div><div className="text-lg font-bold tracking-tight text-slate-900">Zaalima</div></div>
        <div className="mt-1 text-xs text-slate-500">Agile workspace</div>
      </div>
      <div className="px-3 py-3 border-b border-slate-200">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium uppercase tracking-wider text-slate-500">Workspaces</span>
          <button onClick={onCreateWorkspace} className="text-xs text-brand-600 hover:text-brand-700">+ New</button>
        </div>
        <select
          value={currentId || ""}
          onChange={(e) => selectWorkspace(e.target.value)}
          className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
        >
          {workspaces.length === 0 && <option value="">No workspaces</option>}
          {workspaces.map((w) => (
            <option key={w._id} value={w._id}>{w.name}</option>
          ))}
        </select>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        <Link to="/" className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-brand-50 hover:text-brand-700">Boards</Link>
        <Link to="/notifications" className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-brand-50 hover:text-brand-700">Notifications</Link>
        <Link to="/workspace/settings" className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-brand-50 hover:text-brand-700">Workspace Settings</Link>
      </nav>
      <div className="border-t border-slate-200 px-3 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-500 text-white text-sm font-semibold">{initial}</div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{user?.name}</div>
            <div className="text-xs text-slate-500 truncate">{user?.email}</div>
          </div>
          <button onClick={() => { logout(); navigate("/login"); }} className="text-xs text-slate-500 hover:text-slate-800">Logout</button>
        </div>
      </div>
    </aside>
  );
}
