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
    <aside className="flex h-screen w-64 flex-col border-r border-slate-200 bg-white">
      <div className="px-4 py-4 border-b border-slate-200">
        <div className="text-lg font-semibold text-brand-700">Zaalima</div>
        <div className="text-xs text-slate-500">Workspace</div>
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
      <nav className="flex-1 px-2 py-3 space-y-1">
        <Link to="/" className="block rounded px-3 py-2 text-sm text-slate-700 hover:bg-slate-100">Boards</Link>
        <Link to="/workspace/settings" className="block rounded px-3 py-2 text-sm text-slate-700 hover:bg-slate-100">Workspace Settings</Link>
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