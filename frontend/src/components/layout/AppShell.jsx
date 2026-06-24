import React, { useState } from "react";
import Sidebar from "./Sidebar";
import CreateWorkspaceModal from "../workspace/CreateWorkspaceModal";
import { Search } from "lucide-react";

const AppShell = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [showCreateWorkspace, setShowCreateWorkspace] = useState(false);
  const [quickSearch, setQuickSearch] = useState("");

  const handleQuickSearch = (e) => {
    e.preventDefault();
    setQuickSearch("");
  };

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden">
      <Sidebar
        onCreateWorkspace={() => setShowCreateWorkspace(true)}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((c) => !c)}
      />

      {/* Main content area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-14 flex items-center px-6 border-b border-slate-800/50 bg-slate-950/80 backdrop-blur-sm flex-shrink-0">
          <form onSubmit={handleQuickSearch} className="relative w-full max-w-sm">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              value={quickSearch}
              onChange={(e) => setQuickSearch(e.target.value)}
              placeholder="Search boards, cards, or members"
              className="w-full rounded-lg border border-slate-800 bg-slate-900/70 py-2 pl-9 pr-3
                text-sm text-slate-200 placeholder-slate-500 outline-none transition-colors
                focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
            />
          </form>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <button className="p-2 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors">
              <span className="text-xs font-medium">⌘K</span>
            </button>
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </main>

      {showCreateWorkspace && (
        <CreateWorkspaceModal onClose={() => setShowCreateWorkspace(false)} />
      )}
    </div>
  );
};

export default AppShell;
