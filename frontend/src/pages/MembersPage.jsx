import React, { useState } from "react";
import {
  Users, UserPlus, LogOut, Shield, Copy, Check,
  Search, Crown, ChevronDown,
} from "lucide-react";
import { useWorkspace } from "../context/WorkspaceContext";
import { useAuth } from "../context/AuthContext";
import { Avatar } from "../components/layout/Sidebar";
import api from "../utils/api";

const ROLE_STYLES = {
  owner:  "bg-amber-500/15 text-amber-400 border border-amber-500/20",
  admin:  "bg-violet-500/15 text-violet-400 border border-violet-500/20",
  member: "bg-slate-700/60 text-slate-400 border border-slate-700",
  viewer: "bg-slate-800/60 text-slate-500 border border-slate-700",
};

const RoleBadge = ({ role }) => (
  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 ${ROLE_STYLES[role] || ROLE_STYLES.member}`}>
    {role === "owner" && <Crown size={10} />}
    {role === "admin" && <Shield size={10} />}
    {role.charAt(0).toUpperCase() + role.slice(1)}
  </span>
);

// ─── Invite Section ───────────────────────────────────────────────────────────
const InviteSection = ({ workspaceId, canInvite }) => {
  const { inviteMember } = useWorkspace();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);

  if (!canInvite) return null;

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setResult(null);
    const res = await inviteMember(workspaceId, email.trim(), role);
    setLoading(false);
    setResult(res);
    if (res.success) setEmail("");
  };

  const copyLink = () => {
    if (result?.invite?.inviteLink) {
      navigator.clipboard.writeText(result.invite.inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden animate-fade-in">
      <div className="px-6 py-4 border-b border-slate-800 flex items-center gap-2">
        <UserPlus size={16} className="text-violet-400" />
        <h3 className="text-base font-semibold text-white">Invite members</h3>
      </div>
      <div className="p-6">
        <form onSubmit={handleInvite} className="space-y-3">
          <div className="flex gap-3">
            <input
              id="invite-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="colleague@company.com"
              className="flex-1 px-4 py-3 rounded-xl bg-slate-800/60 border border-slate-700
                text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm transition-all"
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="px-3 py-3 rounded-xl bg-slate-800/60 border border-slate-700
                text-slate-300 focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm cursor-pointer"
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
              <option value="viewer">Viewer</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={loading || !email.trim()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500
              text-white font-semibold text-sm disabled:opacity-50 transition-all shadow-lg shadow-violet-500/20"
          >
            <UserPlus size={15} />
            {loading ? "Sending…" : "Send invite"}
          </button>
        </form>

        {result && (
          <div className={`mt-4 p-4 rounded-xl border text-sm animate-fade-in
            ${result.success
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
              : "bg-red-500/10 border-red-500/30 text-red-400"
            }`}
          >
            {result.success ? (
              <div className="space-y-2">
                <p className="font-semibold">Invite created! 🎉</p>
                <div className="flex items-center gap-2 bg-slate-800/60 px-3 py-2 rounded-lg">
                  <code className="flex-1 text-xs text-slate-300 truncate">
                    {result.invite?.inviteLink}
                  </code>
                  <button
                    onClick={copyLink}
                    className="p-1.5 rounded text-slate-400 hover:text-white transition-colors flex-shrink-0"
                    title="Copy link"
                  >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                </div>
              </div>
            ) : (
              result.message
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Member Row ───────────────────────────────────────────────────────────────
const MemberRow = ({ member, currentUserId, userRole, workspaceId, onRemove }) => {
  const isSelf = member.user?._id === currentUserId;
  const canRemove =
    isSelf ||
    (["owner", "admin"].includes(userRole) && member.role !== "owner");

  const [removing, setRemoving] = useState(false);

  const handleRemove = async () => {
    if (!window.confirm(isSelf ? "Leave this workspace?" : `Remove ${member.user?.name}?`)) return;
    setRemoving(true);
    try {
      await api.delete(`/workspaces/${workspaceId}/members/${member.user?._id}`);
      onRemove(member.user?._id);
    } catch (err) {
      console.error(err);
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className="flex items-center gap-4 py-3 px-1 group animate-fade-in">
      <div className="relative">
        <Avatar user={member.user} size="md" />
        {isSelf && (
          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-slate-900" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white truncate">
          {member.user?.name || "Unknown"}
          {isSelf && <span className="ml-2 text-xs text-slate-500 font-normal">(you)</span>}
        </p>
        <p className="text-xs text-slate-500 truncate">{member.user?.email}</p>
      </div>
      <div className="flex items-center gap-3">
        <RoleBadge role={member.role} />
        {canRemove && (
          <button
            onClick={handleRemove}
            disabled={removing}
            title={isSelf ? "Leave workspace" : "Remove member"}
            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-500
              hover:text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-50"
          >
            <LogOut size={14} />
          </button>
        )}
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
const MembersPage = () => {
  const { activeWorkspace, setWorkspaces, workspaces } = useWorkspace();
  const { user } = useAuth();
  const [search, setSearch] = useState("");

  if (!activeWorkspace) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center py-20 animate-fade-in">
        <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center text-3xl mb-4">👥</div>
        <h3 className="text-lg font-semibold text-white mb-2">No workspace selected</h3>
        <p className="text-slate-500 text-sm">Select a workspace from the sidebar first.</p>
      </div>
    );
  }

  const userRole =
    activeWorkspace.members?.find((m) => m.user?._id === user?._id)?.role || "member";
  const canInvite = ["owner", "admin"].includes(userRole);

  const members = activeWorkspace.members || [];
  const filtered = search.trim()
    ? members.filter((m) =>
        m.user?.name?.toLowerCase().includes(search.toLowerCase()) ||
        m.user?.email?.toLowerCase().includes(search.toLowerCase())
      )
    : members;

  // Remove member from local state optimistically
  const handleRemove = (userId) => {
    setWorkspaces((prev) =>
      prev.map((ws) =>
        ws._id === activeWorkspace._id
          ? { ...ws, members: ws.members.filter((m) => m.user?._id !== userId) }
          : ws
      )
    );
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between mb-2 animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-xl">
            {activeWorkspace.icon}
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">{activeWorkspace.name}</h1>
            <p className="text-sm text-slate-500">
              {members.length} member{members.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800 border border-slate-700">
          <Users size={13} className="text-violet-400" />
          <span className="text-xs font-semibold text-slate-300">{members.length}</span>
        </div>
      </div>

      {/* Members list */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden animate-fade-in">
        <div className="px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-violet-400" />
            <h3 className="text-base font-semibold text-white flex-1">Members</h3>
            {/* Search */}
            <div className="flex items-center gap-2 bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-1.5">
              <Search size={13} className="text-slate-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search…"
                className="bg-transparent text-white text-xs placeholder-slate-500 focus:outline-none w-28"
              />
            </div>
          </div>
        </div>

        <div className="divide-y divide-slate-800/60 px-6">
          {filtered.length === 0 ? (
            <p className="py-8 text-center text-slate-500 text-sm">No members found.</p>
          ) : (
            filtered.map((member) => (
              <MemberRow
                key={member.user?._id || member.user}
                member={member}
                currentUserId={user?._id}
                userRole={userRole}
                workspaceId={activeWorkspace._id}
                onRemove={handleRemove}
              />
            ))
          )}
        </div>
      </div>

      {/* Invite section */}
      <InviteSection workspaceId={activeWorkspace._id} canInvite={canInvite} />
    </div>
  );
};

export default MembersPage;
