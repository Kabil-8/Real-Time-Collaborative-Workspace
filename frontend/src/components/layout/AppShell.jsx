import React, { useState, useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Search, Bell, Command, ChevronRight } from "lucide-react";
import Sidebar, { Avatar } from "./Sidebar";
import CreateWorkspaceModal from "../workspace/CreateWorkspaceModal";
import ThemeToggle from "./ThemeToggle";
import SearchModal from "../ui/SearchModal";
import { useAuth } from "../../context/AuthContext";
import { useWorkspace } from "../../context/WorkspaceContext";

// ─── Breadcrumb ───────────────────────────────────────────────────────────────
const Breadcrumb = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { activeWorkspace } = useWorkspace();

  const segments = [];

  if (location.pathname === "/" || location.pathname === "/boards") {
    segments.push({ label: "Home", path: "/" });
  } else if (location.pathname === "/search") {
    segments.push({ label: "Home", path: "/" });
    segments.push({ label: "Search", path: null });
  } else if (location.pathname.includes("/boards/")) {
    segments.push({ label: "Boards", path: "/boards" });
    segments.push({ label: "Board", path: null });
  } else if (location.pathname.includes("/members")) {
    if (activeWorkspace) segments.push({ label: activeWorkspace.name, path: "/" });
    segments.push({ label: "Members", path: null });
  } else if (location.pathname.includes("/settings")) {
    if (activeWorkspace) segments.push({ label: activeWorkspace.name, path: "/" });
    segments.push({ label: "Settings", path: null });
  }

  return (
    <nav className="flex items-center gap-1 text-sm">
      {segments.map((seg, i) => (
        <React.Fragment key={i}>
          {i > 0 && <ChevronRight size={13} className="text-slate-700 flex-shrink-0" />}
          {seg.path ? (
            <button
              onClick={() => navigate(seg.path)}
              className="text-slate-500 hover:text-slate-300 font-medium transition-colors px-1 py-0.5 rounded"
            >
              {seg.label}
            </button>
          ) : (
            <span className="text-slate-300 font-semibold px-1">{seg.label}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
};

// ─── AppShell ─────────────────────────────────────────────────────────────────
const AppShell = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [showCreateWorkspace, setShowCreateWorkspace] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const { user } = useAuth();

  // ⌘K / Ctrl+K opens search
  const openSearch = useCallback(() => setShowSearch(true), []);
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        openSearch();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [openSearch]);

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden">
      <Sidebar
        onCreateWorkspace={() => setShowCreateWorkspace(true)}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((c) => !c)}
      />

      {/* Main content area */}
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Top bar */}
        <header className="h-14 flex items-center px-5 gap-4 border-b border-slate-800/40
          bg-slate-950/90 backdrop-blur-sm flex-shrink-0 relative z-10">

          {/* Breadcrumb */}
          <div className="flex-1 min-w-0">
            <Breadcrumb />
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Search chip */}
            <button
              id="global-search-trigger"
              onClick={openSearch}
              className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg
                bg-slate-800/60 border border-slate-700/50 text-slate-500
                hover:text-slate-300 hover:bg-slate-800 hover:border-slate-600
                transition-all text-sm group"
            >
              <Search size={13} />
              <span className="text-xs">Search…</span>
              <kbd className="ml-1 flex items-center gap-0.5 px-1.5 py-0.5 rounded-md
                bg-slate-700 text-slate-400 text-[10px] font-mono group-hover:bg-slate-600
                transition-colors">
                <Command size={9} />K
              </kbd>
            </button>

            {/* Notification bell */}
            <button className="relative p-2 rounded-xl text-slate-500 hover:text-slate-300
              hover:bg-slate-800/60 dark:hover:bg-slate-800/60 transition-all">
              <Bell size={16} />
              {/* Notification dot */}
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-violet-500
                border-2 border-slate-950 dark:border-slate-950">
                <span className="absolute inset-0 rounded-full bg-violet-400 animate-ping opacity-75" />
              </span>
            </button>

            {/* Theme toggle */}
            <ThemeToggle />

            {/* Divider + User avatar */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-800 dark:border-slate-800">
              <Avatar user={user} size="sm" online />
            </div>
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 overflow-y-auto relative">
          {children}
        </div>
      </main>

      {showCreateWorkspace && (
        <CreateWorkspaceModal onClose={() => setShowCreateWorkspace(false)} />
      )}

      {showSearch && <SearchModal onClose={() => setShowSearch(false)} />}
    </div>
  );
};

export default AppShell;
