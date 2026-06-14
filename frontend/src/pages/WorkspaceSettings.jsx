import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Settings, Users, UserPlus, Copy, Check, Shield, Trash2, AlertTriangle } from "lucide-react";
import { useWorkspace } from "../context/WorkspaceContext";
import { useAuth } from "../context/AuthContext";
import { Avatar } from "../components/layout/Sidebar";

const ICONS  = ["🏢", "🚀", "⚡", "🎯", "🛠️", "🌟", "🔥", "💡", "🎨", "📦"];
const COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#eab308", "#22c55e", "#3b82f6"];

// ─── Tab button ───────────────────────────────────────────────────────────────
const Tab = ({ label, active, onClick, icon: Icon }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold
      transition-all duration-200
      ${active
        ? "bg-violet-500/15 text-violet-300 shadow-sm"
        : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/40"
      }`}
  >
    <Icon size={15} />
    {label}
  </button>
);

// ─── Field wrapper ────────────────────────────────────────────────────────────
const Field = ({ label, children }) => (
  <div className="space-y-1.5">
    <label className="block text-sm font-medium text-slate-300">{label}</label>
    {children}
  </div>
);

// ─── Workspace Settings ───────────────────────────────────────────────────────
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
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const [saveError, setSaveError] = useState("");

  // Invite form
  const [inviteEmail, setInviteEmail]   = useState("");
  const [inviteRole, setInviteRole]     = useState("member");
  const [inviting, setInviting]         = useState(false);
  const [inviteResult, setInviteResult] = useState(null);
  const [copiedLink, setCopiedLink]     = useState(false);

  const userRole = activeWorkspace?.members?.find((m) => m.user?._id === user?._id)?.role;
  const canEdit  = ["owner", "admin"].includes(userRole);

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
        Select a workspace first.
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
      {/* ── Page header ─────────────────────────────────────────────── */}
      <div
        className="relative rounded-2xl overflow-hidden p-6 animate-fade-in"
        style={{
          background: form.color
            ? `linear-gradient(135deg, ${form.color}25, ${form.color}08, transparent)`
            : "linear-gradient(135deg, rgba(124,58,237,0.15), transparent)",
          border: `1px solid ${form.color || "#7c3aed"}20`,
        }}
      >
        <div className="flex items-center gap-4">
          {/* Live preview icon */}
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl
              shadow-xl flex-shrink-0 transition-all duration-300"
            style={{
              background: `linear-gradient(135deg, ${form.color}, ${form.color}99)`,
              boxShadow: `0 8px 30px ${form.color}40`,
            }}
          >
            {form.icon}
          </div>
          <div>
            <h1 className="text-xl font-black text-white leading-tight">
              {form.name || activeWorkspace.name}
            </h1>
            <p className="text-sm text-slate-400 mt-0.5">Workspace Settings</p>
          </div>
        </div>
      </div>

      {/* ── Tab navigation ──────────────────────────────────────────── */}
      <div className="flex gap-1 p-1 rounded-2xl glass">
        <Tab label="General" active={activeTab === "general"} onClick={() => setActiveTab("general")} icon={Settings} />
        <Tab label="Members" active={activeTab === "members"} onClick={() => setActiveTab("members")} icon={Users} />
        {canEdit && (
          <Tab label="Invite"  active={activeTab === "invite"}  onClick={() => setActiveTab("invite")}  icon={UserPlus} />
        )}
      </div>

      {/* ── General tab ─────────────────────────────────────────────── */}
      {activeTab === "general" && (
        <div className="glass rounded-2xl overflow-hidden animate-fade-in">
          <div className="px-6 py-4 border-b border-white/5 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-violet-500/15 flex items-center justify-center">
              <Settings size={15} className="text-violet-400" />
            </div>
            <h3 className="text-base font-bold text-white">General settings</h3>
          </div>
          <form onSubmit={handleSave} className="p-6 space-y-5">
            {saveError && (
              <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20
                text-red-400 text-sm flex items-center gap-2 animate-fade-in">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                {saveError}
              </div>
            )}

            <Field label="Workspace name">
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                disabled={!canEdit}
                className="input-field disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </Field>

            <Field label="Description">
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                disabled={!canEdit}
                rows={3}
                className="input-field resize-none disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="What does this workspace track?"
              />
            </Field>

            {/* Icon + Color grid */}
            <div className="grid grid-cols-2 gap-5">
              <Field label="Icon">
                <div className="flex flex-wrap gap-1.5">
                  {ICONS.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => canEdit && setForm((f) => ({ ...f, icon }))}
                      className={`w-9 h-9 rounded-xl text-lg transition-all duration-150
                        ${form.icon === icon
                          ? "bg-violet-500/20 ring-2 ring-violet-500 scale-110"
                          : "bg-slate-800/60 hover:bg-slate-700"
                        }
                        ${!canEdit ? "opacity-50 cursor-not-allowed" : "hover:scale-105"}`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="Color">
                <div className="flex flex-wrap gap-2">
                  {COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => canEdit && setForm((f) => ({ ...f, color }))}
                      className={`w-8 h-8 rounded-full transition-all duration-150
                        ${!canEdit ? "opacity-50 cursor-not-allowed" : "hover:scale-110"}`}
                      style={{
                        backgroundColor: color,
                        boxShadow: form.color === color
                          ? `0 0 0 3px rgba(255,255,255,0.15), 0 0 0 5px ${color}60, 0 0 15px ${color}50`
                          : "none",
                        transform: form.color === color ? "scale(1.15)" : undefined,
                      }}
                    />
                  ))}
                </div>
              </Field>
            </div>

            {canEdit && (
              <button
                type="submit"
                disabled={saving}
                className="btn-primary"
              >
                {saved ? (
                  <><Check size={14} /> Saved!</>
                ) : saving ? (
                  <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving…</>
                ) : (
                  "Save changes"
                )}
              </button>
            )}
          </form>
        </div>
      )}

      {/* ── Members tab ─────────────────────────────────────────────── */}
      {activeTab === "members" && (
        <div className="glass rounded-2xl overflow-hidden animate-fade-in">
          <div className="px-6 py-4 border-b border-white/5 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-violet-500/15 flex items-center justify-center">
              <Users size={15} className="text-violet-400" />
            </div>
            <h3 className="text-base font-bold text-white flex-1">Members</h3>
            <span className="text-xs text-slate-500 bg-slate-800 px-2.5 py-1 rounded-full">
              {activeWorkspace.members?.length || 0}
            </span>
          </div>
          <div className="px-4 py-2">
            {activeWorkspace.members?.map((member) => (
              <div
                key={member.user?._id || member.user}
                className="flex items-center gap-3 py-3 px-2 rounded-xl
                  hover:bg-white/3 transition-all group"
              >
                <Avatar user={member.user} size="sm" online={member.user?._id === user?._id} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">
                    {member.user?.name || "Unknown"}
                    {member.user?._id === user?._id && (
                      <span className="ml-2 text-xs text-slate-500 font-normal">(you)</span>
                    )}
                  </p>
                  <p className="text-xs text-slate-500 truncate">{member.user?.email}</p>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border flex items-center gap-1.5
                  ${member.role === "owner"  ? "bg-amber-500/15 text-amber-300 border-amber-500/20" :
                    member.role === "admin"  ? "bg-violet-500/15 text-violet-300 border-violet-500/20" :
                                               "bg-slate-700/40 text-slate-400 border-slate-700/60"}`}
                >
                  {member.role === "owner" && <Shield size={10} />}
                  {member.role}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Invite tab ──────────────────────────────────────────────── */}
      {activeTab === "invite" && canEdit && (
        <div className="glass rounded-2xl overflow-hidden animate-fade-in">
          <div className="px-6 py-4 border-b border-white/5 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-violet-500/15 flex items-center justify-center">
              <UserPlus size={15} className="text-violet-400" />
            </div>
            <h3 className="text-base font-bold text-white">Invite members</h3>
          </div>
          <form onSubmit={handleInvite} className="p-6 space-y-4">
            <div className="flex gap-3">
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="colleague@company.com"
                className="input-field flex-1"
              />
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="input-field w-32 flex-shrink-0"
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>
            <button type="submit" disabled={inviting || !inviteEmail} className="btn-primary">
              <UserPlus size={14} />
              {inviting ? "Sending…" : "Send invite"}
            </button>

            {inviteResult && (
              <div className={`p-4 rounded-xl border text-sm animate-fade-in
                ${inviteResult.success
                  ? "bg-emerald-500/8 border-emerald-500/20 text-emerald-400"
                  : "bg-red-500/8 border-red-500/20 text-red-400"}`}
              >
                {inviteResult.success ? (
                  <div className="space-y-2">
                    <p className="font-semibold flex items-center gap-2">
                      <Check size={14} /> Invite created!
                    </p>
                    <div className="flex items-center gap-2 bg-slate-800/60 px-3 py-2 rounded-xl
                      border border-slate-700/40">
                      <code className="flex-1 text-xs text-slate-300 truncate">
                        {inviteResult.invite?.inviteLink}
                      </code>
                      <button onClick={copyLink}
                        className={`p-1.5 rounded-lg transition-all
                          ${copiedLink ? "text-emerald-400 bg-emerald-500/15" : "text-slate-400 hover:text-white"}`}>
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
          </form>
        </div>
      )}
    </div>
  );
};

export default WorkspaceSettings;
