import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Settings, Users, UserPlus, Copy, Check, Shield, Trash2,
  AlertTriangle, Sparkles, Mail, Globe, Crown, Eye, User,
  Palette, Info
} from "lucide-react";
import { useWorkspace } from "../context/WorkspaceContext";
import { useAuth } from "../context/AuthContext";
import { Avatar } from "../components/layout/Sidebar";

const ICONS = ["🏢", "🚀", "⚡", "🎯", "🛠️", "🌟", "🔥", "💡", "🎨", "📦"];
const COLORS = [
  "#6366f1", // Indigo
  "#8b5cf6", // Violet
  "#ec4899", // Pink
  "#14b8a6", // Teal
  "#f97316", // Orange
  "#eab308", // Yellow
  "#22c55e", // Green
  "#3b82f6"  // Blue
];

const ROLE_META = {
  owner:  { icon: Crown,  color: "#eab308", bg: "rgba(234,179,8,0.08)",  label: "Owner" },
  admin:  { icon: Shield, color: "#8b5cf6", bg: "rgba(139,92,246,0.08)",  label: "Admin" },
  member: { icon: User,   color: "#64748b", bg: "rgba(100,116,139,0.08)", label: "Member" },
  viewer: { icon: Eye,    color: "#0ea5e9", bg: "rgba(14,165,233,0.08)",  label: "Viewer" }
};

const WorkspaceSettings = () => {
  const { workspaceId } = useParams();
  const navigate = useNavigate();
  const { activeWorkspace, updateWorkspace, inviteMember } = useWorkspace();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState("general");
  const [form, setForm] = useState({
    name:        activeWorkspace?.name        || "",
    description: activeWorkspace?.description || "",
    icon:        activeWorkspace?.icon        || "🏢",
    color:       activeWorkspace?.color       || "#6366f1",
  });
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);
  const [saveError, setSaveError] = useState("");

  const [inviteEmail, setInviteEmail]   = useState("");
  const [inviteRole, setInviteRole]     = useState("member");
  const [inviting, setInviting]         = useState(false);
  const [inviteResult, setInviteResult] = useState(null);
  const [copiedLink, setCopiedLink]     = useState(false);

  const userRole = activeWorkspace?.members?.find((m) => m.user?._id === user?._id)?.role;
  const canEdit  = ["owner", "admin"].includes(userRole);
  const totalMembers = activeWorkspace?.members?.length || 0;

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    setSaveError("");
    const result = await updateWorkspace(workspaceId || activeWorkspace?._id, form);
    setSaving(false);
    if (result.success) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } else {
      setSaveError(result.message);
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail) return;
    setInviting(true);
    setInviteResult(null);
    const result = await inviteMember(workspaceId || activeWorkspace?._id, inviteEmail, inviteRole);
    setInviting(false);
    setInviteResult(result);
    if (result.success) setInviteEmail("");
  };

  const copyLink = () => {
    if (inviteResult?.invite?.inviteLink) {
      navigator.clipboard.writeText(inviteResult.invite.inviteLink);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  if (!activeWorkspace) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500">
        <div className="text-center space-y-2">
          <Settings size={28} className="mx-auto text-slate-600 animate-spin" />
          <p className="text-sm font-medium">Select a workspace first.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-full px-8 py-8 space-y-8 max-w-5xl mx-auto" style={{ color: "var(--color-text)" }}>
      
      {/* ── Header Title & Subtitle ─────────────────────────────────── */}
      <div className="pb-5 border-b" style={{ borderColor: "var(--color-border)" }}>
        <h1 className="text-2xl font-bold tracking-tight">Workspace Settings</h1>
        <p className="text-sm mt-1" style={{ color: "var(--color-text-muted)" }}>
          Manage your workspace profile, colors, members, and collaborator permissions.
        </p>
      </div>

      {/* ── Navigation Tabs ────────────────────────────────────────── */}
      <div className="flex gap-6 border-b" style={{ borderColor: "var(--color-border)" }}>
        <button
          onClick={() => setActiveTab("general")}
          className={`pb-3 text-sm font-medium transition-all relative ${
            activeTab === "general" ? "text-violet-500 font-semibold" : "text-slate-400 hover:text-slate-600"
          }`}
        >
          General
          {activeTab === "general" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-500 rounded-full" />
          )}
        </button>
        <button
          onClick={() => setActiveTab("members")}
          className={`pb-3 text-sm font-medium transition-all relative ${
            activeTab === "members" ? "text-violet-500 font-semibold" : "text-slate-400 hover:text-slate-600"
          }`}
        >
          Members ({totalMembers})
          {activeTab === "members" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-500 rounded-full" />
          )}
        </button>
        {canEdit && (
          <button
            onClick={() => setActiveTab("invite")}
            className={`pb-3 text-sm font-medium transition-all relative ${
              activeTab === "invite" ? "text-violet-500 font-semibold" : "text-slate-400 hover:text-slate-600"
            }`}
          >
            Invite People
            {activeTab === "invite" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-500 rounded-full" />
            )}
          </button>
        )}
      </div>

      {/* ── Active Tab View ─────────────────────────────────────────── */}
      <div className="w-full">
        
        {/* ── Tab: General Settings ───────────────────────────────── */}
        {activeTab === "general" && (
          <form onSubmit={handleSave} className="space-y-6 animate-fade-in">
            {saveError && (
              <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2 animate-fade-in">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                {saveError}
              </div>
            )}

            {/* Profile Card */}
            <div
              className="rounded-xl border p-6 space-y-6"
              style={{
                backgroundColor: "var(--color-surface)",
                borderColor: "var(--color-border)",
              }}
            >
              <div>
                <h3 className="text-base font-semibold">Workspace Profile</h3>
                <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                  Change the name and details of this workspace.
                </p>
              </div>

              <div className="space-y-5">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Workspace Name
                  </label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    disabled={!canEdit}
                    placeholder="Workspace name"
                    className="input-field disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Workspace Description
                  </label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    disabled={!canEdit}
                    rows={3}
                    placeholder="Workspace description"
                    className="input-field resize-none disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            {/* Theme & Branding Card */}
            <div
              className="rounded-xl border p-6 space-y-6"
              style={{
                backgroundColor: "var(--color-surface)",
                borderColor: "var(--color-border)",
              }}
            >
              <div>
                <h3 className="text-base font-semibold">Workspace Theme</h3>
                <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                  Customize the appearance and branding of your workspace.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Pickers */}
                <div className="space-y-5">
                  <div className="space-y-2">
                    <span className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Workspace Icon
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {ICONS.map((icon) => (
                        <button
                          key={icon}
                          type="button"
                          onClick={() => canEdit && setForm((f) => ({ ...f, icon }))}
                          className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center transition-all duration-150
                            ${form.icon === icon
                              ? "bg-violet-500/20 ring-2 ring-violet-500 scale-105"
                              : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700"
                            }
                            ${!canEdit ? "opacity-45 cursor-not-allowed" : "hover:scale-105"}`}
                        >
                          {icon}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Workspace Theme Color
                    </span>
                    <div className="flex flex-wrap gap-2.5">
                      {COLORS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => canEdit && setForm((f) => ({ ...f, color }))}
                          className={`w-7 h-7 rounded-full transition-all duration-150 relative flex items-center justify-center
                            ${!canEdit ? "opacity-45 cursor-not-allowed" : "hover:scale-110"}`}
                          style={{
                            backgroundColor: color,
                            boxShadow: form.color === color
                              ? `0 0 0 2px var(--color-surface), 0 0 0 4px ${color}`
                              : "none",
                          }}
                        >
                          {form.color === color && (
                            <div className="w-2 h-2 rounded-full bg-white shadow-sm" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Branding Preview */}
                <div className="flex flex-col justify-center items-center p-6 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/10">
                  <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-4 self-start">
                    Branding Preview
                  </span>
                  <div
                    className="flex items-center gap-3.5 p-4 rounded-xl border w-full max-w-sm"
                    style={{
                      backgroundColor: "var(--color-surface)",
                      borderColor: "var(--color-border)",
                    }}
                  >
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-sm text-white"
                      style={{
                        background: `linear-gradient(135deg, ${form.color}, ${form.color}bb)`,
                      }}
                    >
                      {form.icon}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold truncate">{form.name || "My Workspace"}</p>
                      <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                        {totalMembers} member{totalMembers !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Save Button */}
            {canEdit && (
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary px-8 py-3 shadow-md shadow-violet-500/15"
                >
                  {saved ? (
                    <><Check size={16} /> Saved Successfully!</>
                  ) : saving ? (
                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving…</>
                  ) : (
                    "Save Workspace Details"
                  )}
                </button>
              </div>
            )}
          </form>
        )}

        {/* ── Tab: Members Directory ──────────────────────────────── */}
        {activeTab === "members" && (
          <div className="space-y-4 animate-fade-in">
            <div
              className="rounded-xl border overflow-hidden"
              style={{
                backgroundColor: "var(--color-surface)",
                borderColor: "var(--color-border)",
              }}
            >
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-bg)" }}>
                    <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Member
                    </th>
                    <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Email Address
                    </th>
                    <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Workspace Role
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                  {activeWorkspace.members?.map((member) => {
                    const isYou = member.user?._id === user?._id;
                    const meta = ROLE_META[member.role] || ROLE_META.member;
                    const RoleIcon = meta.icon;

                    return (
                      <tr key={member.user?._id || member.user} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10">
                        <td className="px-6 py-4 flex items-center gap-3">
                          <Avatar user={member.user} size="sm" online={isYou} />
                          <span className="text-sm font-medium">
                            {member.user?.name || "Unknown"}
                            {isYou && (
                              <span className="ml-2 text-[10px] font-semibold px-2 py-0.5 rounded bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20">
                                You
                              </span>
                            )}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm" style={{ color: "var(--color-text-muted)" }}>
                          {member.user?.email}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                            style={{
                              backgroundColor: meta.bg,
                              color: meta.color,
                              border: `1px solid ${meta.color}20`
                            }}
                          >
                            <RoleIcon size={11} />
                            {meta.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Tab: Invite Collaborators ──────────────────────────── */}
        {activeTab === "invite" && canEdit && (
          <div className="space-y-6 animate-fade-in">
            <div
              className="rounded-xl border p-6 space-y-6"
              style={{
                backgroundColor: "var(--color-surface)",
                borderColor: "var(--color-border)",
              }}
            >
              <div>
                <h3 className="text-base font-semibold">Invite Members</h3>
                <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                  Send an email invitation to add collaborators to this workspace.
                </p>
              </div>

              <form onSubmit={handleInvite} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="md:col-span-2 space-y-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="email"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder="collaborator@company.com"
                        className="input-field pl-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Role
                    </label>
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value)}
                      className="input-field select-field"
                    >
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                      <option value="viewer">Viewer</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button type="submit" disabled={inviting || !inviteEmail} className="btn-primary">
                    <UserPlus size={15} />
                    {inviting ? "Sending..." : "Send Invite"}
                  </button>
                </div>
              </form>

              {inviteResult && (
                <div className={`p-4 rounded-xl border text-sm animate-fade-in
                  ${inviteResult.success
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                    : "bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400"}`}
                >
                  {inviteResult.success ? (
                    <div className="space-y-3">
                      <p className="font-semibold flex items-center gap-2">
                        <Check size={16} /> Invitation link generated successfully!
                      </p>
                      <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800">
                        <code className="flex-1 text-xs truncate">
                          {inviteResult.invite?.inviteLink}
                        </code>
                        <button
                          onClick={copyLink}
                          type="button"
                          className={`p-1.5 rounded-lg transition-all
                            ${copiedLink
                              ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
                              : "text-slate-500 hover:text-slate-700 hover:bg-slate-200 dark:hover:bg-slate-800"
                            }`}
                        >
                          {copiedLink ? <Check size={13} /> : <Copy size={13} />}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                      {inviteResult.message}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

      </div>

    </div>
  );
};

export default WorkspaceSettings;
