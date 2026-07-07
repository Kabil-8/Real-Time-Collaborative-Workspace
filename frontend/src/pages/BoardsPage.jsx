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
      duration-200 hover:scale-[1.02] hover:shadow-xl hover:shadow-black/20"
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
    className="h-32 rounded-2xl border-2 border-dashed flex items-center justify-center gap-2
      transition-all duration-200"
    style={{
      borderColor: "var(--border-strong)",
      color: "var(--text-muted)",
    }}
    onMouseEnter={e => {
      e.currentTarget.style.borderColor = "var(--brand-primary)";
      e.currentTarget.style.color = "var(--text-brand)";
      e.currentTarget.style.background = "rgba(124, 58, 237, 0.05)";
    }}
    onMouseLeave={e => {
      e.currentTarget.style.borderColor = "var(--border-strong)";
      e.currentTarget.style.color = "var(--text-muted)";
      e.currentTarget.style.background = "transparent";
    }}
  >
    <Plus size={18} />
    <span className="text-sm font-medium">New board</span>
  </button>
);

const BoardsPage = () => {
  const { user } = useAuth();
  const { activeWorkspace, fetchWorkspaces } = useWorkspace();
  const navigate = useNavigate();

  const [boards, setBoards] = useState([]);
  const [loadingBoards, setLoadingBoards] = useState(false);
  const [showCreateBoard, setShowCreateBoard] = useState(false);
  const [newBoardTitle, setNewBoardTitle] = useState("");
  const [creating, setCreating] = useState(false);

  // Pending invitations state
  const [invitations, setInvitations] = useState([]);
  const [loadingInvites, setLoadingInvites] = useState(false);

  const fetchInvitations = async () => {
    setLoadingInvites(true);
    try {
      const { data } = await api.get("/workspaces/invitations");
      setInvitations(data.invitations || []);
    } catch (err) {
      console.error("Failed to fetch invitations", err);
    } finally {
      setLoadingInvites(false);
    }
  };

  useEffect(() => {
    fetchWorkspaces();
    fetchInvitations();
  }, []);

  const handleAcceptInvite = async (token) => {
    try {
      await api.post(`/workspaces/accept-invite/${token}`);
      await fetchWorkspaces();
      await fetchInvitations();
    } catch (err) {
      console.error("Failed to accept invitation", err);
      alert(err.response?.data?.message || "Failed to accept invitation");
    }
  };

  const handleRejectInvite = async (token) => {
    try {
      await api.post(`/workspaces/reject-invite/${token}`);
      await fetchInvitations();
    } catch (err) {
      console.error("Failed to reject invitation", err);
      alert(err.response?.data?.message || "Failed to reject invitation");
    }
  };

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
        <h1 className="text-3xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>
          {greeting}, {firstName} 👋
        </h1>
        <p style={{ color: "var(--text-secondary)" }}>
          {activeWorkspace
            ? `You're working in ${activeWorkspace.name}`
            : "Create or join a workspace to get started."}
        </p>
      </div>

      {/* Pending Workspace Invitations */}
      {invitations.length > 0 && (
        <div
          className="mb-8 rounded-3xl p-6"
          style={{
            background: "rgba(139, 92, 246, 0.08)",
            border: "1px solid rgba(139, 92, 246, 0.25)",
          }}
        >
          <h2 className="text-lg font-bold mb-2 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
            ✉️ Workspace Invitations
          </h2>
          <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
            You have been invited to join the following workspaces.
          </p>
          <div className="flex flex-col gap-3">
            {invitations.map((inv) => (
              <div
                key={inv.inviteToken}
                className="flex flex-wrap items-center justify-between gap-4 rounded-2xl p-4"
                style={{
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border-default)",
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                    style={{ background: "var(--bg-surface-3)" }}
                  >
                    {inv.icon || "🏢"}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                      {inv.name}
                    </h3>
                    <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                      Invited as{" "}
                      <span style={{ color: "var(--text-brand)" }} className="capitalize">
                        {inv.role}
                      </span>{" "}
                      by {inv.owner?.name || "Workspace Owner"} ({inv.owner?.email})
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleAcceptInvite(inv.inviteToken)}
                    className="px-4 py-2 rounded-xl text-white text-xs font-semibold transition-colors"
                    style={{ background: "var(--brand-primary)" }}
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => handleRejectInvite(inv.inviteToken)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold transition-colors"
                    style={{
                      background: "var(--bg-surface-4)",
                      color: "var(--text-secondary)",
                      border: "1px solid var(--border-default)",
                    }}
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeWorkspace ? (
        <>
          {/* Boards section */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <Trello size={18} style={{ color: "var(--text-brand)" }} />
                <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
                  Boards
                </h2>
                <span
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{
                    background: "var(--bg-surface-4)",
                    color: "var(--text-secondary)",
                  }}
                >
                  {boards.length}
                </span>
              </div>
            </div>

            {loadingBoards ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="h-32 rounded-2xl animate-pulse"
                    style={{ background: "var(--skeleton-base)" }}
                  />
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
                  <form
                    onSubmit={handleCreateBoard}
                    className="h-32 rounded-2xl p-3 flex flex-col gap-2"
                    style={{
                      background: "var(--bg-surface-2)",
                      border: "1px solid var(--border-default)",
                    }}
                  >
                    <input
                      autoFocus
                      value={newBoardTitle}
                      onChange={(e) => setNewBoardTitle(e.target.value)}
                      placeholder="Board title…"
                      className="flex-1 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
                      style={{
                        background: "var(--bg-input)",
                        border: "1px solid var(--border-default)",
                        color: "var(--text-primary)",
                        "--tw-ring-color": "var(--brand-primary)",
                      }}
                    />
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={creating || !newBoardTitle.trim()}
                        className="flex-1 py-1.5 rounded-lg text-white text-xs font-semibold
                          disabled:opacity-50 transition-colors"
                        style={{ background: "var(--brand-primary)" }}
                      >
                        {creating ? "Creating…" : "Create"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowCreateBoard(false)}
                        className="px-3 py-1.5 rounded-lg text-xs transition-colors"
                        style={{
                          background: "var(--bg-surface-4)",
                          color: "var(--text-secondary)",
                        }}
                      >
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
              <div
                key={label}
                className="rounded-2xl px-5 py-4"
                style={{
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border-default)",
                  boxShadow: "var(--shadow-sm)",
                }}
              >
                <p className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
                  {value}
                </p>
                <p className="text-sm mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                  {label}
                </p>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-4"
            style={{ background: "var(--bg-surface-3)" }}
          >
            🏢
          </div>
          <h3 className="text-lg font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
            No workspace yet
          </h3>
          <p className="text-sm mb-6 max-w-xs" style={{ color: "var(--text-secondary)" }}>
            Create a workspace to start organizing your team's work.
          </p>
        </div>
      )}
    </div>
  );
};

export default BoardsPage;
