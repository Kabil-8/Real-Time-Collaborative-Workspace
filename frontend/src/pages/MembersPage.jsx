import React, { useState } from "react";
import {
  Users, UserPlus, LogOut, Shield, Copy, Check,
  Search, Crown, Mail, ChevronDown, Sparkles
} from "lucide-react";
import { useWorkspace } from "../context/WorkspaceContext";
import { useAuth } from "../context/AuthContext";
import { Avatar } from "../components/layout/Sidebar";
import api from "../utils/api";

const ROLE_CONFIG = {
  owner:  { label: "Owner",  classes: "bg-amber-500/15 text-amber-300 border-amber-500/25",   Icon: Crown,  glow: "0 0 14px rgba(245,158,11,0.25)"  },
  admin:  { label: "Admin",  classes: "bg-violet-500/15 text-violet-300 border-violet-500/25", Icon: Shield, glow: "0 0 14px rgba(124,58,237,0.25)" },
  member: { label: "Member", classes: "bg-slate-700/40 text-slate-400 border-slate-600/30",    Icon: null,   glow: null },
  viewer: { label: "Viewer", classes: "bg-slate-800/50 text-slate-500 border-slate-700/30",    Icon: null,   glow: null },
};

const RoleBadge = ({ role }) => {
  const cfg = ROLE_CONFIG[role] || ROLE_CONFIG.member;
  const Icon = cfg.Icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border
        ${cfg.classes} whitespace-nowrap flex-shrink-0`}
      style={cfg.glow ? { boxShadow: cfg.glow } : undefined}
    >
      {Icon && <Icon size={10} />}
      {cfg.label}
    </span>
  );
};

// ─── Stat pill ────────────────────────────────────────────────────────────────
const StatPill = ({ label, value, color }) => (
  <div className="flex flex-col items-center justify-center px-6 py-4 rounded-2xl
    glass text-center min-w-[100px]">
    <span className={`text-2xl font-black ${color}`}>{value}</span>
    <span className="text-xs text-slate-500 mt-0.5 font-medium">{label}</span>
  </div>
);

// ─── Invite Panel ─────────────────────────────────────────────────────────────
const InvitePanel = ({ workspaceId, canInvite }) => {
  const { inviteMember } = useWorkspace();
  const [email, setEmail]   = useState("");
  const [role, setRole]     = useState("member");
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
    <div className="glass rounded-3xl overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="px-8 py-5 border-b border-white/5 flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-violet-500/15 border border-violet-500/20
          flex items-center justify-center">
          <UserPlus size={18} className="text-violet-400" />
        </div>
        <div>
          <h3 className="text-base font-bold text-white">Invite new member</h3>
          <p className="text-xs text-slate-500 mt-0.5">Send an invite link via email</p>
        </div>
      </div>

      <div className="p-8">
        <form onSubmit={handleInvite}>
          <div className="flex gap-3 items-end">
            {/* Email input */}
            <div className="flex-1 space-y-1.5">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Email address
              </label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                <input
                  id="invite-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="colleague@company.com"
                  className="input-field pl-10"
                />
              </div>
            </div>

            {/* Role select */}
            <div className="w-36 space-y-1.5 flex-shrink-0">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="input-field select-field"
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="btn-primary flex-shrink-0 h-[46px] px-6"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <UserPlus size={15} />
              )}
              {loading ? "Sending…" : "Send invite"}
            </button>
          </div>
        </form>

        {/* Result */}
        {result && (
          <div
            className={`mt-5 p-4 rounded-2xl border text-sm animate-scale-in
              ${result.success
                ? "bg-emerald-500/8 border-emerald-500/20 text-emerald-300"
                : "bg-red-500/8 border-red-500/20 text-red-400"
              }`}
          >
            {result.success ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 font-semibold">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <Check size={11} className="text-emerald-400" />
                  </div>
                  Invite link created successfully!
                </div>
                <div className="flex items-center gap-2 bg-slate-900/60 px-4 py-2.5 rounded-xl
                  border border-slate-700/40">
                  <code className="flex-1 text-xs text-slate-300 truncate">
                    {result.invite?.inviteLink}
                  </code>
                  <button
                    onClick={copyLink}
                    className={`p-1.5 rounded-lg transition-all flex-shrink-0 font-medium text-xs flex items-center gap-1
                      ${copied ? "text-emerald-400 bg-emerald-500/15" : "text-slate-400 hover:text-white hover:bg-slate-700"}`}
                  >
                    {copied ? <><Check size={12} /> Copied!</> : <><Copy size={12} /> Copy</>}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                {result.message}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Member Card (grid view) ──────────────────────────────────────────────────
const MemberCard = ({ member, currentUserId, userRole, workspaceId, onRemove }) => {
  const isSelf = member.user?._id === currentUserId;
  const canRemove =
    isSelf || (["owner", "admin"].includes(userRole) && member.role !== "owner");
  const [removing, setRemoving] = useState(false);
  const [hover, setHover] = useState(false);

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

  const cfg = ROLE_CONFIG[member.role] || ROLE_CONFIG.member;

  return (
    <div
      className="relative rounded-2xl p-5 transition-all duration-200 cursor-default group animate-fade-in"
      style={{
        background: hover ? "rgba(30,41,59,0.70)" : "rgba(15,23,42,0.60)",
        border: hover ? "1px solid rgba(124,58,237,0.25)" : "1px solid rgba(255,255,255,0.06)",
        backdropFilter: "blur(12px)",
        boxShadow: hover ? "0 8px 30px rgba(0,0,0,0.30), 0 0 0 1px rgba(124,58,237,0.10)" : "none",
        transform: hover ? "translateY(-2px)" : "none",
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {/* Remove button */}
      {canRemove && (
        <button
          onClick={handleRemove}
          disabled={removing}
          title={isSelf ? "Leave workspace" : "Remove member"}
          className="absolute top-3 right-3 opacity-0 group-hover:opacity-100
            p-1.5 rounded-xl text-slate-600 hover:text-red-400 hover:bg-red-500/10
            transition-all disabled:opacity-30"
        >
          <LogOut size={13} />
        </button>
      )}

      <div className="flex flex-col items-center text-center gap-3">
        {/* Avatar */}
        <div className="relative">
          <Avatar user={member.user} size="lg" online={isSelf} />
          {/* Role icon overlay */}
          {cfg.Icon && (
            <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-slate-950
              flex items-center justify-center
              ${member.role === "owner" ? "bg-amber-500" : "bg-violet-500"}`}>
              <cfg.Icon size={9} className="text-white" />
            </div>
          )}
        </div>

        {/* Name + email */}
        <div className="min-w-0 w-full">
          <p className="text-sm font-bold text-white truncate">
            {member.user?.name || "Unknown"}
          </p>
          {isSelf && (
            <span className="text-[10px] text-violet-400 font-semibold bg-violet-500/10
              px-2 py-0.5 rounded-full">you</span>
          )}
          <p className="text-xs text-slate-500 truncate mt-0.5">{member.user?.email}</p>
        </div>

        {/* Role badge */}
        <RoleBadge role={member.role} />
      </div>
    </div>
  );
};

// ─── Member List Row (list-view) ─────────────────────────────────────────────
// Must be its own component so useState is not called inside a .map() callback
const MemberListRow = ({ member, currentUserId, userRole, workspaceId, onRemove }) => {
  const isSelf    = member.user?._id === currentUserId;
  const canRemove = isSelf || (["owner", "admin"].includes(userRole) && member.role !== "owner");
  const [removing, setRemoving] = useState(false);

  const handleRemoveItem = async () => {
    if (!window.confirm(isSelf ? "Leave?" : `Remove ${member.user?.name}?`)) return;
    setRemoving(true);
    try {
      await api.delete(`/workspaces/${workspaceId}/members/${member.user?._id}`);
      onRemove(member.user?._id);
    } catch (e) {
      setRemoving(false);
    }
  };

  return (
    <div
      className="flex items-center gap-4 px-6 py-4 hover:bg-white/3 transition-all group"
    >
      <Avatar user={member.user} size="md" online={isSelf} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-white truncate">
          {member.user?.name || "Unknown"}
          {isSelf && <span className="ml-2 text-xs text-violet-400 font-medium">(you)</span>}
        </p>
        <p className="text-xs text-slate-500 truncate">{member.user?.email}</p>
      </div>
      <RoleBadge role={member.role} />
      {canRemove && (
        <button
          onClick={handleRemoveItem}
          disabled={removing}
          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-xl
            text-slate-600 hover:text-red-400 hover:bg-red-500/10
            transition-all disabled:opacity-30"
        >
          <LogOut size={14} />
        </button>
      )}
    </div>
  );
};

// ─── Main Members Page ────────────────────────────────────────────────────────
const MembersPage = () => {
  const { activeWorkspace, setWorkspaces } = useWorkspace();
  const { user } = useAuth();
  const [search, setSearch]   = useState("");
  const [viewMode, setViewMode] = useState("grid"); // "grid" | "list"

  if (!activeWorkspace) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center py-24 animate-fade-in">
        <div className="w-20 h-20 rounded-3xl glass flex items-center justify-center text-4xl mb-5">👥</div>
        <h3 className="text-xl font-bold text-white mb-2">No workspace selected</h3>
        <p className="text-slate-500 text-sm">Select a workspace from the sidebar to manage members.</p>
      </div>
    );
  }

  const userRole  = activeWorkspace.members?.find((m) => m.user?._id === user?._id)?.role || "member";
  const canInvite = ["owner", "admin"].includes(userRole);
  const members   = activeWorkspace.members || [];
  const filtered  = search.trim()
    ? members.filter((m) =>
        m.user?.name?.toLowerCase().includes(search.toLowerCase()) ||
        m.user?.email?.toLowerCase().includes(search.toLowerCase())
      )
    : members;

  const handleRemove = (userId) => {
    setWorkspaces((prev) =>
      prev.map((ws) =>
        ws._id === activeWorkspace._id
          ? { ...ws, members: ws.members.filter((m) => m.user?._id !== userId) }
          : ws
      )
    );
  };

  const owners  = filtered.filter((m) => m.role === "owner");
  const admins  = filtered.filter((m) => m.role === "admin");
  const regular = filtered.filter((m) => m.role !== "owner" && m.role !== "admin");

  return (
    <div className="min-h-full">
      {/* ── Hero banner ─────────────────────────────────────────────── */}
      <div
        className="relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg,
            ${activeWorkspace.color || "#7c3aed"}22 0%,
            ${activeWorkspace.color || "#4f46e5"}10 40%,
            rgba(2,6,23,0) 100%)`,
          borderBottom: `1px solid ${activeWorkspace.color || "#7c3aed"}18`,
        }}
      >
        {/* Ambient glow orb */}
        <div
          className="absolute -top-20 -left-20 w-96 h-96 rounded-full blur-3xl opacity-25 pointer-events-none"
          style={{ background: activeWorkspace.color || "#7c3aed" }}
        />

        <div className="relative px-8 py-10">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 justify-between">
              {/* Workspace identity */}
              <div className="flex items-center gap-5">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0 shadow-2xl"
                  style={{
                    background: `linear-gradient(135deg, ${activeWorkspace.color || "#7c3aed"}, ${activeWorkspace.color || "#4f46e5"}99)`,
                    boxShadow: `0 12px 40px ${activeWorkspace.color || "#7c3aed"}50`,
                  }}
                >
                  {activeWorkspace.icon || "🏢"}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h1 className="text-2xl font-black text-white">{activeWorkspace.name}</h1>
                    <span
                      className="px-2.5 py-0.5 rounded-full text-xs font-bold border"
                      style={{
                        background: `${activeWorkspace.color || "#7c3aed"}20`,
                        borderColor: `${activeWorkspace.color || "#7c3aed"}40`,
                        color: activeWorkspace.color || "#a78bfa",
                      }}
                    >
                      {userRole.charAt(0).toUpperCase() + userRole.slice(1)}
                    </span>
                  </div>
                  <p className="text-slate-400 text-sm">
                    {members.length} member{members.length !== 1 ? "s" : ""} · Manage team access
                  </p>
                </div>
              </div>

              {/* Stats row */}
              <div className="flex gap-3">
                <StatPill label="Total"    value={members.length}                            color="text-white" />
                <StatPill label="Admins"   value={members.filter(m => ["owner","admin"].includes(m.role)).length} color="text-violet-300" />
                <StatPill label="Members"  value={members.filter(m => m.role === "member").length} color="text-slate-300" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main content ─────────────────────────────────────────────── */}
      <div className="px-8 py-8 max-w-6xl mx-auto space-y-8">

        {/* ── Toolbar ─────────────────────────────────────────────────── */}
        <div className="flex items-center gap-4 flex-wrap">
          {/* Search */}
          <div className="flex items-center gap-2.5 bg-slate-900/70 border border-slate-700/40
            rounded-xl px-4 py-2.5 flex-1 min-w-[200px] max-w-xs">
            <Search size={14} className="text-slate-500 flex-shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search members…"
              className="bg-transparent text-sm text-white placeholder-slate-500
                focus:outline-none flex-1"
            />
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {/* View toggle */}
            <div className="flex gap-1 p-1 rounded-xl glass">
              {[
                { mode: "grid", icon: "⊞" },
                { mode: "list", icon: "☰" },
              ].map(({ mode, icon }) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all
                    ${viewMode === mode
                      ? "bg-violet-500/20 text-violet-300"
                      : "text-slate-500 hover:text-slate-300"
                    }`}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Member groups ────────────────────────────────────────────── */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 glass rounded-3xl">
            <p className="text-slate-500 text-sm">No members match your search.</p>
          </div>
        ) : viewMode === "grid" ? (
          <div className="space-y-8">
            {/* Owners & Admins */}
            {[...owners, ...admins].length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-500">
                    Owners & Admins
                  </span>
                  <span className="w-4 h-px bg-slate-800" />
                  <span className="text-xs text-slate-600">{[...owners, ...admins].length}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {[...owners, ...admins].map((member) => (
                    <MemberCard
                      key={member.user?._id || member.user}
                      member={member}
                      currentUserId={user?._id}
                      userRole={userRole}
                      workspaceId={activeWorkspace._id}
                      onRemove={handleRemove}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Members */}
            {regular.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Members</span>
                  <span className="w-4 h-px bg-slate-800" />
                  <span className="text-xs text-slate-600">{regular.length}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {regular.map((member) => (
                    <MemberCard
                      key={member.user?._id || member.user}
                      member={member}
                      currentUserId={user?._id}
                      userRole={userRole}
                      workspaceId={activeWorkspace._id}
                      onRemove={handleRemove}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ── List view ──────────────────────────────────────────────── */
          <div className="glass rounded-3xl overflow-hidden">
            <div className="divide-y divide-white/4">
              {filtered.map((member) => (
                <MemberListRow
                  key={member.user?._id || member.user}
                  member={member}
                  currentUserId={user?._id}
                  userRole={userRole}
                  workspaceId={activeWorkspace._id}
                  onRemove={handleRemove}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── Invite panel ─────────────────────────────────────────────── */}
        {canInvite && (
          <InvitePanel workspaceId={activeWorkspace._id} canInvite={canInvite} />
        )}
      </div>
    </div>
  );
};

export default MembersPage;
