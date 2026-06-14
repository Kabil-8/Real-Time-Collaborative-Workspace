import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus, Trello, Clock, Star, ArrowRight, Users, Activity,
  X, Sparkles, BarChart3, Zap, ChevronRight
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useWorkspace } from "../context/WorkspaceContext";
import api from "../utils/api";

const GRADIENTS = [
  "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
  "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
  "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
  "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
  "linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)",
  "linear-gradient(135deg, #fd7043 0%, #ffcc02 100%)",
  "linear-gradient(135deg, #30cfd0 0%, #330867 100%)",
  "linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)",
];

// ─── Board Card ───────────────────────────────────────────────────────────────
const BoardCard = ({ board, onClick }) => {
  const idx = parseInt(board._id?.slice(-2) || "0", 16) % GRADIENTS.length;
  const bg  = board.background?.value || GRADIENTS[idx];
  const [hover, setHover] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="group relative rounded-2xl overflow-hidden h-44 text-left
        transition-all duration-300 focus-visible:ring-2 focus-visible:ring-violet-500"
      style={{
        background: bg,
        transform: hover ? "translateY(-4px) scale(1.01)" : "none",
        boxShadow: hover
          ? "0 24px 60px rgba(0,0,0,0.50), 0 0 0 1px rgba(255,255,255,0.10)"
          : "0 4px 20px rgba(0,0,0,0.30)",
        transition: "all 0.25s cubic-bezier(0.34,1.56,0.64,1)",
      }}
    >
      {/* Gradient overlay */}
      <div className="absolute inset-0 transition-all duration-300"
        style={{
          background: hover
            ? "linear-gradient(to bottom, rgba(0,0,0,0.10) 0%, rgba(0,0,0,0.55) 100%)"
            : "linear-gradient(to bottom, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.65) 100%)"
        }}
      />

      {/* Shimmer */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{ background: "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.08) 50%, transparent 60%)" }} />

      {/* Content */}
      <div className="relative p-4 h-full flex flex-col justify-between">
        <div className="flex items-start justify-between gap-2">
          <span className="text-white font-bold text-sm leading-snug line-clamp-2 drop-shadow-sm">
            {board.title}
          </span>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {board.isStarred && <Star size={13} className="text-yellow-300 fill-yellow-300" />}
            <div className="w-6 h-6 rounded-lg bg-white/15 flex items-center justify-center
              opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0 duration-200">
              <ArrowRight size={12} className="text-white" />
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-white/60 text-xs">
            <Clock size={10} />
            <span>{new Date(board.lastActivity || board.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
          </div>
          <div className="flex items-center gap-1 bg-white/10 px-2 py-0.5 rounded-full text-white/60 text-xs">
            <Users size={9} />
            <span>{board.members?.length || 0}</span>
          </div>
        </div>
      </div>
    </button>
  );
};

// ─── Create Board Card ────────────────────────────────────────────────────────
const CreateBoardCard = ({ onClick }) => (
  <button
    onClick={onClick}
    className="h-44 rounded-2xl border border-dashed border-slate-700/60 group
      hover:border-violet-500/60 flex flex-col items-center justify-center gap-3
      transition-all duration-200 hover:bg-violet-500/5"
  >
    <div className="w-12 h-12 rounded-2xl border border-dashed border-slate-700
      group-hover:border-violet-500/50 flex items-center justify-center
      group-hover:bg-violet-500/10 transition-all duration-200">
      <Plus size={20} className="text-slate-600 group-hover:text-violet-400 transition-colors" />
    </div>
    <span className="text-sm font-semibold text-slate-600 group-hover:text-violet-400 transition-colors">
      New board
    </span>
  </button>
);

// ─── Stat card ────────────────────────────────────────────────────────────────
const StatCard = ({ icon: Icon, label, value, gradient, delay = 0, sub }) => (
  <div
    className="relative rounded-2xl p-6 overflow-hidden animate-count-up"
    style={{
      background: "rgba(15,23,42,0.70)",
      border: "1px solid rgba(255,255,255,0.06)",
      backdropFilter: "blur(12px)",
      animationDelay: `${delay}ms`,
    }}
  >
    {/* Gradient bg */}
    <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ background: gradient }} />
    <div className="relative flex items-start gap-4">
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
        style={{ background: gradient }}>
        <Icon size={20} className="text-white" />
      </div>
      <div>
        <p className="text-3xl font-black text-white leading-none mb-1">{value}</p>
        <p className="text-sm font-semibold text-slate-300">{label}</p>
        {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  </div>
);

// ─── Live clock ───────────────────────────────────────────────────────────────
const useClock = () => {
  const [t, setT] = useState(new Date());
  useEffect(() => { const id = setInterval(() => setT(new Date()), 1000); return () => clearInterval(id); }, []);
  return t;
};

// ─── Home Page ────────────────────────────────────────────────────────────────
const HomePage = () => {
  const { user } = useAuth();
  const { activeWorkspace, fetchWorkspaces } = useWorkspace();
  const navigate = useNavigate();
  const now = useClock();

  const [boards, setBoards]             = useState([]);
  const [loadingBoards, setLoadingBoards] = useState(false);
  const [showCreateBoard, setShowCreateBoard] = useState(false);
  const [newBoardTitle, setNewBoardTitle]     = useState("");
  const [creating, setCreating]               = useState(false);

  useEffect(() => { fetchWorkspaces(); }, []);
  useEffect(() => {
    if (!activeWorkspace) return;
    setLoadingBoards(true);
    api.get(`/workspaces/${activeWorkspace._id}/boards`)
      .then(({ data }) => setBoards(data.boards || []))
      .catch(console.error)
      .finally(() => setLoadingBoards(false));
  }, [activeWorkspace]);

  const handleCreateBoard = async (e) => {
    e.preventDefault();
    if (!newBoardTitle.trim() || !activeWorkspace) return;
    setCreating(true);
    try {
      const { data } = await api.post("/boards", {
        title: newBoardTitle.trim(),
        workspaceId: activeWorkspace._id,
      });
      setBoards((prev) => [data.board, ...prev]);
      setNewBoardTitle("");
      setShowCreateBoard(false);
    } catch (err) {
      console.error("Failed to create board", err);
    } finally {
      setCreating(false);
    }
  };

  const firstName = user?.name?.split(" ")[0] || "there";
  const hour      = now.getHours();
  const greeting  = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const emoji     = hour < 12 ? "☀️" : hour < 17 ? "⚡" : "🌙";
  const timeStr   = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  const dateStr   = now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <div className="min-h-full">
      {/* ── Top hero strip ──────────────────────────────────────────── */}
      <div
        className="relative overflow-hidden"
        style={{
          background: activeWorkspace?.color
            ? `linear-gradient(135deg, ${activeWorkspace.color}1a 0%, rgba(2,6,23,0) 60%)`
            : "linear-gradient(135deg, rgba(124,58,237,0.12) 0%, rgba(2,6,23,0) 60%)",
          borderBottom: "1px solid rgba(255,255,255,0.04)",
        }}
      >
        <div className="orb orb-violet w-[500px] h-[500px] -top-32 -left-20 opacity-40" />
        <div className="orb orb-indigo w-[300px] h-[300px] top-0 right-1/4 opacity-30" />

        <div className="relative px-8 py-10 max-w-7xl mx-auto">
          <div className="flex items-start justify-between gap-6 flex-wrap">
            {/* Greeting */}
            <div className="animate-fade-in">
              <p className="text-slate-500 text-sm font-medium mb-2 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-dot" />
                {dateStr}
              </p>
              <h1 className="text-4xl font-black text-white leading-tight mb-2">
                {greeting},{" "}
                <span className="gradient-text">{firstName}</span>{" "}
                <span className="text-3xl">{emoji}</span>
              </h1>
              <p className="text-slate-400 text-base">
                {activeWorkspace
                  ? <>You're working in <span className="text-white font-bold">{activeWorkspace.name}</span></>
                  : "Create or select a workspace to get started."}
              </p>
            </div>

            {/* Clock */}
            <div
              className="rounded-2xl px-6 py-4 text-right animate-fade-in flex-shrink-0"
              style={{ background: "rgba(15,23,42,0.70)", border: "1px solid rgba(255,255,255,0.06)", backdropFilter: "blur(12px)" }}
            >
              <p className="text-3xl font-mono font-black text-white tracking-tight">{timeStr}</p>
              <p className="text-xs text-slate-500 mt-1">{dateStr}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main content ─────────────────────────────────────────────── */}
      <div className="px-8 py-8 max-w-7xl mx-auto space-y-10">

        {activeWorkspace ? (
          <>
            {/* ── Stats ─────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 animate-fade-in">
              <StatCard
                icon={Trello}    label="Boards"       value={boards.length}
                gradient="linear-gradient(135deg, #7c3aed, #4f46e5)" delay={0}
                sub="Total boards in workspace"
              />
              <StatCard
                icon={Users}     label="Members"      value={activeWorkspace.members?.length || 0}
                gradient="linear-gradient(135deg, #0ea5e9, #6366f1)" delay={80}
                sub="Active collaborators"
              />
              <StatCard
                icon={Activity}  label="Activity"     value="Live"
                gradient="linear-gradient(135deg, #10b981, #059669)" delay={160}
                sub="Real-time collaboration"
              />
            </div>

            {/* ── Boards ────────────────────────────────────────────── */}
            <div className="animate-fade-in">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-violet-500/15 border border-violet-500/20
                    flex items-center justify-center">
                    <Trello size={16} className="text-violet-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-white">Your Boards</h2>
                    <p className="text-xs text-slate-500">{boards.length} board{boards.length !== 1 ? "s" : ""}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCreateBoard(true)}
                  className="btn-primary"
                >
                  <Plus size={15} />
                  New board
                </button>
              </div>

              {loadingBoards ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-44 rounded-2xl skeleton" style={{ animationDelay: `${i * 80}ms` }} />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
                  {boards.map((board) => (
                    <BoardCard
                      key={board._id}
                      board={board}
                      onClick={() => navigate(`/boards/${board._id}`)}
                    />
                  ))}

                  {showCreateBoard ? (
                    <form
                      onSubmit={handleCreateBoard}
                      className="h-44 rounded-2xl p-4 flex flex-col gap-3 animate-scale-in"
                      style={{
                        background: "rgba(15,23,42,0.80)",
                        border: "1px solid rgba(124,58,237,0.30)",
                        backdropFilter: "blur(12px)",
                        boxShadow: "0 0 30px rgba(124,58,237,0.10)",
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">New Board</span>
                        <button type="button" onClick={() => setShowCreateBoard(false)}
                          className="p-1 rounded-lg text-slate-600 hover:text-slate-400 transition-colors">
                          <X size={13} />
                        </button>
                      </div>
                      <input
                        autoFocus
                        value={newBoardTitle}
                        onChange={(e) => setNewBoardTitle(e.target.value)}
                        placeholder="Board title…"
                        className="input-field flex-1 text-sm"
                      />
                      <button type="submit" disabled={creating || !newBoardTitle.trim()}
                        className="w-full py-2.5 rounded-xl font-bold text-white text-xs
                          disabled:opacity-50 transition-all"
                        style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }}
                      >
                        {creating ? "Creating…" : "Create board"}
                      </button>
                    </form>
                  ) : (
                    <CreateBoardCard onClick={() => setShowCreateBoard(true)} />
                  )}
                </div>
              )}
            </div>

            {/* ── Quick links ───────────────────────────────────────── */}
            <div className="animate-fade-in">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">Quick access</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { label: "Members",  desc: "Manage team & roles",         icon: Users,     path: `/workspace/${activeWorkspace._id}/members`,  color: "#6366f1" },
                  { label: "Settings", desc: "Workspace configuration",      icon: Sparkles,  path: `/workspace/${activeWorkspace._id}/settings`,  color: "#8b5cf6" },
                  { label: "Activity", desc: "Recent workspace activity",    icon: BarChart3, path: "/",                                          color: "#10b981" },
                ].map(({ label, desc, icon: Icon, path, color }) => (
                  <button key={label} onClick={() => navigate(path)}
                    className="flex items-center gap-4 p-4 rounded-2xl text-left group
                      transition-all duration-200 hover:scale-[1.02]"
                    style={{
                      background: "rgba(15,23,42,0.60)",
                      border: "1px solid rgba(255,255,255,0.05)",
                      backdropFilter: "blur(12px)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = `${color}40`;
                      e.currentTarget.style.boxShadow = `0 8px 30px rgba(0,0,0,0.30)`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "rgba(255,255,255,0.05)";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  >
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: `${color}20`, border: `1px solid ${color}30` }}>
                      <Icon size={17} style={{ color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white">{label}</p>
                      <p className="text-xs text-slate-500 truncate">{desc}</p>
                    </div>
                    <ChevronRight size={15} className="text-slate-600 group-hover:text-slate-400
                      group-hover:translate-x-0.5 transition-all" />
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : (
          /* ── No workspace empty state ──────────────────────────────── */
          <div className="flex flex-col items-center justify-center py-32 text-center animate-fade-in">
            <div className="relative mb-8">
              <div
                className="w-24 h-24 rounded-3xl flex items-center justify-center text-5xl"
                style={{ background: "rgba(15,23,42,0.80)", border: "1px solid rgba(255,255,255,0.07)" }}
              >
                🏢
              </div>
              <div className="absolute -top-3 -right-3 w-10 h-10 rounded-2xl
                bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center
                shadow-lg shadow-violet-500/40">
                <Sparkles size={16} className="text-white" />
              </div>
              {/* Glow */}
              <div className="absolute inset-0 rounded-3xl blur-2xl bg-violet-500/10 -z-10 scale-150" />
            </div>
            <h3 className="text-2xl font-black text-white mb-3">No workspace yet</h3>
            <p className="text-slate-400 text-base mb-2 max-w-sm leading-relaxed">
              Create a workspace to start organizing your team's work with powerful Kanban boards.
            </p>
            <p className="text-slate-600 text-sm flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse-dot" />
              Click the workspace switcher in the sidebar to get started
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default HomePage;
