import React, { useState } from "react";
import Sidebar from "./Sidebar";
import CreateWorkspaceModal from "../workspace/CreateWorkspaceModal";

const AppShell = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [showCreateWorkspace, setShowCreateWorkspace] = useState(false);
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
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <button className="p-2 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors">
              <span className="text-xs font-medium">⌘K</span>
            </button>
          </div>
        </header>

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
