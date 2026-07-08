import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Settings, Users, Trash2, UserPlus, Copy, Check, Shield } from "lucide-react";
import { useWorkspace } from "../context/WorkspaceContext";
import { useAuth } from "../context/AuthContext";
import { Avatar } from "../components/layout/Sidebar";

const ICONS = ["🏢", "🚀", "⚡", "🎯", "🛠️", "🌟", "🔥", "💡", "🎨", "📦"];
const COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#eab308", "#22c55e", "#3b82f6"];
const Section = ({ title, children }) => (
  <div
    className="rounded-2xl overflow-hidden"
    style={{
      background: "var(--bg-surface)",
      border: "1px solid var(--border-default)",
      boxShadow: "var(--shadow-sm)",
    }}
  >
    <div
      className="px-6 py-4"
      style={{
        borderBottom: "1px solid var(--border-subtle)",
      }}
    >
      <h3 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
        {title}
      </h3>
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

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [inviting, setInviting] = useState(false);
  const [inviteResult, setInviteResult] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const userRole = activeWorkspace?.getMemberRole?.(user?._id) ||
    activeWorkspace?.members?.find((m) => m.user?._id === user?._id)?.role;
  const canEdit = ["owner", "admin"].includes(userRole);
  const canInvite = canEdit || (activeWorkspace?.settings?.allowMemberInvites !== false && userRole === "member");

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
      <div className="flex items-center justify-center h-full" style={{ color: "var(--text-muted)" }}>
        Select a workspace first.
      </div>
    );
  }

  const inputStyle = {
    background: "var(--bg-input)",
    border: "1px solid var(--border-default)",
    color: "var(--text-primary)",
    width: "100%",
    padding: "12px 16px",
    borderRadius: "12px",
    fontSize: "14px",
    outline: "none",
    transition: "border-color 0.15s",
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
          style={{ background: "var(--bg-surface-3)" }}
        >
          {activeWorkspace.icon}
        </div>
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
            {activeWorkspace.name}
          </h1>
          <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
            Workspace Settings
          </p>
        </div>
      </div>

      {/* General settings */}
      <Section title="General">
        <form onSubmit={handleSave} className="space-y-5">
          {saveError && (
            <div
              className="px-4 py-3 rounded-lg text-sm"
              style={{
                background: "rgba(220,38,38,0.08)",
                border: "1px solid rgba(220,38,38,0.25)",
                color: "var(--text-error)",
              }}
            >
              {saveError}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
              Workspace name
            </label>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              disabled={!canEdit}
              style={inputStyle}
              onFocus={e => (e.target.style.borderColor = "var(--border-focus)")}
              onBlur={e => (e.target.style.borderColor = "var(--border-default)")}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              disabled={!canEdit}
              rows={3}
              style={{ ...inputStyle, resize: "none" }}
              onFocus={e => (e.target.style.borderColor = "var(--border-focus)")}
              onBlur={e => (e.target.style.borderColor = "var(--border-default)")}
            />
          </div>

          {/* Icon + Color */}
          <div className="grid grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-secondary)" }}>
                Icon
              </label>
              <div className="flex flex-wrap gap-1.5">
                {ICONS.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => canEdit && setForm((f) => ({ ...f, icon }))}
                    className="w-9 h-9 rounded-lg text-lg transition-all"
                    style={{
                      background: form.icon === icon ? "rgba(124,58,237,0.15)" : "var(--bg-surface-3)",
                      outline: form.icon === icon ? "2px solid var(--border-focus)" : "none",
                      outlineOffset: "1px",
                      opacity: !canEdit ? 0.5 : 1,
                      cursor: !canEdit ? "not-allowed" : "pointer",
                    }}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-secondary)" }}>
                Color
              </label>
              <div className="flex flex-wrap gap-2">
                {COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => canEdit && setForm((f) => ({ ...f, color }))}
                    className="w-7 h-7 rounded-full transition-all"
                    style={{
                      backgroundColor: color,
                      outline: form.color === color ? `3px solid ${color}` : "none",
                      outlineOffset: "2px",
                      opacity: !canEdit ? 0.5 : 1,
                      cursor: !canEdit ? "not-allowed" : "pointer",
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          {canEdit && (
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-semibold text-sm disabled:opacity-50 transition-all"
              style={{ background: "var(--brand-primary)" }}
            >
              {saved ? <><Check size={15} /> Saved</> : saving ? "Saving…" : "Save changes"}
            </button>
          )}
        </form>
      </Section>

      {/* Members */}
      <Section title="Members">
        <div className="space-y-3">
          {activeWorkspace.members?.map((member) => (
            <div
              key={member.user?._id || member.user}
              className="flex items-center gap-3 py-2"
            >
              <Avatar user={member.user} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
                  {member.user?.name || "Unknown"}
                </p>
                <p className="text-xs truncate" style={{ color: "var(--text-tertiary)" }}>
                  {member.user?.email}
                </p>
              </div>
              <span
                className="px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1.5"
                style={
                  member.role === "owner"
                    ? { background: "rgba(245,158,11,0.12)", color: "#d97706" }
                    : member.role === "admin"
                    ? { background: "rgba(124,58,237,0.12)", color: "var(--text-brand)" }
                    : member.role === "viewer"
                    ? { background: "rgba(59,130,246,0.12)", color: "rgba(59,130,246,1)" }
                    : { background: "var(--bg-surface-4)", color: "var(--text-secondary)" }
                }
              >
                {member.role === "owner" && <Shield size={11} />}
                {member.role}
              </span>
            </div>
          ))}
        </div>
      </Section>

      {/* Invite */}
      {canInvite && (
        <Section title="Invite members">
          <form onSubmit={handleInvite} className="space-y-4">
            <div className="flex gap-3">
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="colleague@company.com"
                style={{ ...inputStyle, width: undefined, flex: 1 }}
                onFocus={e => (e.target.style.borderColor = "var(--border-focus)")}
                onBlur={e => (e.target.style.borderColor = "var(--border-default)")}
              />
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                style={{
                  ...inputStyle,
                  width: undefined,
                  padding: "12px",
                }}
                onFocus={e => (e.target.style.borderColor = "var(--border-focus)")}
                onBlur={e => (e.target.style.borderColor = "var(--border-default)")}
              >
                <option value="member">Member</option>
                {canEdit && <option value="admin">Admin</option>}
                <option value="viewer">Viewer</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={inviting || !inviteEmail}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-semibold text-sm disabled:opacity-50 transition-all"
              style={{ background: "var(--brand-primary)" }}
            >
              <UserPlus size={15} />
              {inviting ? "Sending…" : "Send invite"}
            </button>
          </form>

          {inviteResult && (
            <div
              className="mt-4 p-4 rounded-xl text-sm"
              style={
                inviteResult.success
                  ? {
                      background: "rgba(16,185,129,0.08)",
                      border: "1px solid rgba(16,185,129,0.25)",
                      color: "var(--text-success)",
                    }
                  : {
                      background: "rgba(220,38,38,0.08)",
                      border: "1px solid rgba(220,38,38,0.25)",
                      color: "var(--text-error)",
                    }
              }
            >
              {inviteResult.success ? (
                <div className="space-y-2">
                  <p className="font-medium">Invite created!</p>
                  <div
                    className="flex items-center gap-2 px-3 py-2 rounded-lg"
                    style={{ background: "var(--bg-surface-3)" }}
                  >
                    <code className="flex-1 text-xs truncate" style={{ color: "var(--text-secondary)" }}>
                      {inviteResult.invite?.inviteLink}
                    </code>
                    <button
                      onClick={copyLink}
                      className="p-1.5 rounded transition-colors"
                      style={{ color: "var(--text-muted)" }}
                    >
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
