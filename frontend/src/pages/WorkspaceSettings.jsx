import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Settings, Users, Trash2, UserPlus, Copy, Check, Shield } from "lucide-react";
import { useWorkspace } from "../../context/WorkspaceContext";
import { useAuth } from "../../context/AuthContext";
import { Avatar } from "../components/layout/Sidebar";

const ICONS = ["🏢", "🚀", "⚡", "🎯", "🛠️", "🌟", "🔥", "💡", "🎨", "📦"];
const COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#eab308", "#22c55e", "#3b82f6"];

const Section = ({ title, children }) => (
  <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden">
    <div className="px-6 py-4 border-b border-slate-800">
      <h3 className="text-base font-semibold text-white">{title}</h3>
    </div>
    <div className="p-6">{children}</div>
  </div>
);

const WorkspaceSettings = () => {
  const { workspaceId } = useParams();
  const navigate = useNavigate();
  const { activeWorkspace, updateWorkspace, inviteMember } = useWorkspace();
  const { user } = useAuth();

  const [form, setForm] = useState({
    name: activeWorkspace?.name || "",
    description: activeWorkspace?.description || "",
    icon: activeWorkspace?.icon || "🏢",
    color: activeWorkspace?.color || "#6366f1",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Invite form
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [inviting, setInviting] = useState(false);
  const [inviteResult, setInviteResult] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const userRole = activeWorkspace?.getMemberRole?.(user?._id) ||
    activeWorkspace?.members?.find((m) => m.user?._id === user?._id)?.role;
  const canEdit = ["owner", "admin"].includes(userRole);

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
    const result = await inviteMember(
      workspaceId || activeWorkspace?._id,
      inviteEmail,
      inviteRole
    );
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
        Select a workspace first.
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-xl">
          {activeWorkspace.icon}
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">{activeWorkspace.name}</h1>
          <p className="text-sm text-slate-500">Workspace Settings</p>
        </div>
      </div>

      {/* General settings */}
      <Section title="General">
        <form onSubmit={handleSave} className="space-y-5">
          {saveError && (
            <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {saveError}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Workspace name
            </label>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              disabled={!canEdit}
              className="w-full px-4 py-3 rounded-xl bg-slate-800/60 border border-slate-700
                text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500
                disabled:opacity-50 disabled:cursor-not-allowed text-sm transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              disabled={!canEdit}
              rows={3}
              className="w-full px-4 py-3 rounded-xl bg-slate-800/60 border border-slate-700
                text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500
                disabled:opacity-50 disabled:cursor-not-allowed text-sm transition-all resize-none"
            />
          </div>

          {/* Icon + Color */}
          <div className="grid grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Icon</label>
              <div className="flex flex-wrap gap-1.5">
                {ICONS.map((icon) => (
                  <button key={icon} type="button"
                    onClick={() => canEdit && setForm((f) => ({ ...f, icon }))}
                    className={`w-9 h-9 rounded-lg text-lg transition-all
                      ${form.icon === icon ? "bg-violet-500/20 ring-2 ring-violet-500" : "bg-slate-800 hover:bg-slate-700"}
                      ${!canEdit ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Color</label>
              <div className="flex flex-wrap gap-2">
                {COLORS.map((color) => (
                  <button key={color} type="button"
                    onClick={() => canEdit && setForm((f) => ({ ...f, color }))}
                    className={`w-7 h-7 rounded-full transition-all
                      ${form.color === color ? "ring-2 ring-offset-2 ring-offset-slate-900 ring-white" : ""}
                      ${!canEdit ? "opacity-50 cursor-not-allowed" : ""}`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </div>

          {canEdit && (
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500
                text-white font-semibold text-sm disabled:opacity-50 transition-all">
              {saved ? <><Check size={15} /> Saved</> : saving ? "Saving…" : "Save changes"}
            </button>
          )}
        </form>
      </Section>

      {/* Members */}
      <Section title="Members">
        <div className="space-y-3">
          {activeWorkspace.members?.map((member) => (
            <div key={member.user?._id || member.user}
              className="flex items-center gap-3 py-2">
              <Avatar user={member.user} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {member.user?.name || "Unknown"}
                </p>
                <p className="text-xs text-slate-500 truncate">{member.user?.email}</p>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1.5
                ${member.role === "owner" ? "bg-amber-500/15 text-amber-400" :
                  member.role === "admin" ? "bg-violet-500/15 text-violet-400" :
                  "bg-slate-700/60 text-slate-400"}`}>
                {member.role === "owner" && <Shield size={11} />}
                {member.role}
              </span>
            </div>
          ))}
        </div>
      </Section>

      {/* Invite */}
      {canEdit && (
        <Section title="Invite members">
          <form onSubmit={handleInvite} className="space-y-4">
            <div className="flex gap-3">
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="colleague@company.com"
                className="flex-1 px-4 py-3 rounded-xl bg-slate-800/60 border border-slate-700
                  text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm"
              />
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="px-3 py-3 rounded-xl bg-slate-800/60 border border-slate-700
                  text-white focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm"
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>
            <button type="submit" disabled={inviting || !inviteEmail}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500
                text-white font-semibold text-sm disabled:opacity-50 transition-all">
              <UserPlus size={15} />
              {inviting ? "Sending…" : "Send invite"}
            </button>
          </form>

          {inviteResult && (
            <div className={`mt-4 p-4 rounded-xl border text-sm
              ${inviteResult.success
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                : "bg-red-500/10 border-red-500/30 text-red-400"}`}>
              {inviteResult.success ? (
                <div className="space-y-2">
                  <p className="font-medium">Invite created!</p>
                  <div className="flex items-center gap-2 bg-slate-800/60 px-3 py-2 rounded-lg">
                    <code className="flex-1 text-xs text-slate-300 truncate">
                      {inviteResult.invite?.inviteLink}
                    </code>
                    <button onClick={copyLink}
                      className="p-1.5 rounded text-slate-400 hover:text-white transition-colors">
                      {copiedLink ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>
              ) : (
                inviteResult.message
              )}
            </div>
          )}
        </Section>
      )}
    </div>
  );
};

export default WorkspaceSettings;
