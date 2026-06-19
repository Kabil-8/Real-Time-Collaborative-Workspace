import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Trello, Clock, Star } from "lucide-react";
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
];

const BoardCard = ({ board, onClick }) => (
  <button
    onClick={onClick}
    className="group relative rounded-2xl overflow-hidden h-32 text-left transition-all
      duration-200 hover:scale-[1.02] hover:shadow-xl hover:shadow-black/30"
    style={{ background: board.background?.value || GRADIENTS[0] }}
  >
    
    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
    <div className="relative p-4 h-full flex flex-col justify-between">
      <div className="flex items-start justify-between">
        <span className="text-white font-semibold text-sm leading-tight line-clamp-2">
          {board.title}
        </span>
        {board.isStarred && <Star size={14} className="text-yellow-300 fill-yellow-300 flex-shrink-0 ml-2" />}
      </div>
      <div className="flex items-center gap-1.5 text-white/70 text-xs">
        <Clock size={11} />
        <span>{new Date(board.lastActivity || board.updatedAt).toLocaleDateString()}</span>
      </div>
    </div>
  </button>
);

const CreateBoardCard = ({ onClick }) => (
  <button
    onClick={onClick}
    className="h-32 rounded-2xl border-2 border-dashed border-slate-700 hover:border-violet-500/50
      flex items-center justify-center gap-2 text-slate-500 hover:text-violet-400
      transition-all duration-200 hover:bg-violet-500/5"
  >
    <Plus size={18} />
    <span className="text-sm font-medium">New board</span>
  </button>
);

const HomePage = () => {
  const { user } = useAuth();
  const { activeWorkspace, fetchWorkspaces } = useWorkspace();
  const navigate = useNavigate();

  const [boards, setBoards] = useState([]);
  const [loadingBoards, setLoadingBoards] = useState(false);
  const [showCreateBoard, setShowCreateBoard] = useState(false);
  const [newBoardTitle, setNewBoardTitle] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchWorkspaces();
  }, []);

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
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="px-8 py-8 max-w-5xl mx-auto">
      {/* Greeting */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-white mb-1">
          {greeting}, {firstName} 👋
        </h1>
        <p className="text-slate-400">
          {activeWorkspace
            ? `You're working in ${activeWorkspace.name}`
            : "Create or join a workspace to get started."}
        </p>
      </div>

      {activeWorkspace ? (
        <>
          {/* Boards section */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <Trello size={18} className="text-violet-400" />
                <h2 className="text-base font-semibold text-white">Boards</h2>
                <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">
                  {boards.length}
                </span>
              </div>
            </div>

            {loadingBoards ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-32 rounded-2xl bg-slate-800/50 animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {boards.map((board) => (
                  <BoardCard
                    key={board._id}
                    board={board}
                    onClick={() => navigate(`/boards/${board._id}`)}
                  />
                ))}
                {showCreateBoard ? (
                  <form onSubmit={handleCreateBoard}
                    className="h-32 rounded-2xl bg-slate-800/60 border border-slate-700 p-3 flex flex-col gap-2">
                    <input
                      autoFocus
                      value={newBoardTitle}
                      onChange={(e) => setNewBoardTitle(e.target.value)}
                      placeholder="Board title…"
                      className="flex-1 bg-slate-900/60 border border-slate-600 rounded-lg px-3 py-2
                        text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                    <div className="flex gap-2">
                      <button type="submit" disabled={creating || !newBoardTitle.trim()}
                        className="flex-1 py-1.5 rounded-lg bg-violet-600 text-white text-xs font-semibold
                          hover:bg-violet-500 disabled:opacity-50 transition-colors">
                        {creating ? "Creating…" : "Create"}
                      </button>
                      <button type="button" onClick={() => setShowCreateBoard(false)}
                        className="px-3 py-1.5 rounded-lg bg-slate-700 text-slate-300 text-xs hover:bg-slate-600 transition-colors">
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <CreateBoardCard onClick={() => setShowCreateBoard(true)} />
                )}
              </div>
            )}
          </div>

          {/* Workspace summary */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Boards", value: boards.length },
              { label: "Members", value: activeWorkspace.members?.length || 0 },
              { label: "Active today", value: "—" },
            ].map(({ label, value }) => (
              <div key={label} className="bg-slate-900/60 border border-slate-800 rounded-2xl px-5 py-4">
                <p className="text-2xl font-bold text-white">{value}</p>
                <p className="text-sm text-slate-500 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center text-3xl mb-4">
            🏢
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">No workspace yet</h3>
          <p className="text-slate-400 text-sm mb-6 max-w-xs">
            Create a workspace to start organizing your team's work.
          </p>
        </div>
      )}
    </div>
  );
};

export default HomePage;
