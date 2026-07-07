import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Users, UserPlus, Trash2, Shield, Search, Check, Copy, AlertCircle } from "lucide-react";
import { useWorkspace } from "../context/WorkspaceContext";
import { useAuth } from "../context/AuthContext";
import { Avatar } from "../components/layout/Sidebar";
import api from "../utils/api";

const MembersPage = () => {
  const { workspaceId } = useParams();
  const { activeWorkspace, inviteMember, removeMember } = useWorkspace();
  const { user } = useAuth();

  // Search filter
  const [searchQuery, setSearchQuery] = useState("");

  // Invite Form state
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [inviting, setInviting] = useState(false);
  const [inviteResult, setInviteResult] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // General state
  const [actionError, setActionError] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // System directory state
  const [allUsers, setAllUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [dirSearchQuery, setDirSearchQuery] = useState("");

  useEffect(() => {
    const fetchAllUsers = async () => {
      setLoadingUsers(true);
      try {
        const { data } = await api.get("/auth/users");
        setAllUsers(data.users || []);
      } catch (err) {
        console.error("Failed to fetch system users", err);
      } finally {
        setLoadingUsers(false);
      }
    };
    fetchAllUsers();
  }, []);

  const getInviteableUsers = () => {
    const memberIds = new Set(
      (activeWorkspace?.members || []).map((m) => (m.user?._id || m.user)?.toString())
    );
    return allUsers.filter((u) => {
      if (memberIds.has(u._id.toString())) return false;
      const query = dirSearchQuery.toLowerCase();
      return (
        u.name.toLowerCase().includes(query) ||
        u.email.toLowerCase().includes(query)
      );
    });
  };

  // Check user privileges
  const currentUserRole =
    activeWorkspace?.members?.find(
      (m) => (m.user?._id || m.user)?.toString() === user?._id?.toString()
    )?.role || "member";
  const canManage = ["owner", "admin"].includes(currentUserRole);
  const canInvite = canManage || (activeWorkspace?.settings?.allowMemberInvites !== false && currentUserRole === "member");

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !activeWorkspace) return;
    setInviting(true);
    setInviteResult(null);
    setActionError("");

    const wsId = workspaceId || activeWorkspace._id;
    const result = await inviteMember(wsId, inviteEmail.trim(), inviteRole);

    setInviting(false);
    setInviteResult(result);
    if (result.success) {
      setInviteEmail("");
    } else {
      setActionError(result.message || "Failed to send invitation.");
    }
  };

  const handleRemoveMember = async (targetUserId) => {
    if (!activeWorkspace) return;
    if (!window.confirm("Are you sure you want to remove this member from the workspace?")) return;

    setActionLoadingId(targetUserId);
    setActionError("");

    const wsId = workspaceId || activeWorkspace._id;
    const result = await removeMember(wsId, targetUserId);

    setActionLoadingId(null);
    if (!result.success) {
      setActionError(result.message || "Failed to remove member.");
    }
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
      <div
        style={{
          display: "flex",
          height: "100%",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--text-muted)",
          fontSize: 15,
        }}
      >
        Select a workspace to view members.
      </div>
    );
  }

  // Filter members list based on query
  const filteredMembers = (activeWorkspace.members || []).filter((m) => {
    const name = m.user?.name || "";
    const email = m.user?.email || "";
    return (
      name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      email.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "36px 24px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: "var(--radius-md)",
            background: "var(--bg-card)",
            border: "1px solid var(--border-subtle)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 20,
          }}
        >
          👥
        </div>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--text-primary)", marginBottom: 4 }}>
            Members
          </h1>
          <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
            Manage who has access to the <strong>{activeWorkspace.name}</strong> workspace
          </p>
        </div>
      </div>

      {actionError && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "12px 16px",
            background: "rgba(244, 63, 94, 0.1)",
            border: "1px solid rgba(244, 63, 94, 0.3)",
            borderRadius: "var(--radius-lg)",
            color: "var(--accent-rose)",
            fontSize: 14,
            marginBottom: 20,
          }}
        >
          <AlertCircle size={16} />
          <span>{actionError}</span>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: canInvite ? "1.6fr 1fr" : "1fr", gap: 24, alignItems: "start" }}>
        {/* Left Column: Members List */}
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-xl)",
            padding: 24,
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
              All Members ({activeWorkspace.members?.length || 0})
            </h3>
          </div>

          {/* Search box */}
          <div style={{ position: "relative", marginBottom: 16 }}>
            <Search
              size={15}
              style={{
                position: "absolute",
                left: 12,
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--text-tertiary)",
              }}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search members by name or email…"
              style={{
                width: "100%",
                padding: "8px 12px 8px 36px",
                borderRadius: "var(--radius-md)",
                background: "var(--bg-app)",
                border: "1.5px solid var(--border-default)",
                color: "var(--text-primary)",
                fontSize: 13.5,
                outline: "none",
              }}
            />
          </div>

          {/* Members loop */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {filteredMembers.length === 0 ? (
              <div style={{ textAlign: "center", padding: "32px 0", color: "var(--text-muted)", fontSize: 13.5 }}>
                No members found matching your search.
              </div>
            ) : (
              filteredMembers.map((member) => {
                const targetUserId = member.user?._id || member.user;
                const isSelf = targetUserId === user?._id;
                const isOwner = member.role === "owner";
                const isTargetAdmin = member.role === "admin";
                const isRemoving = actionLoadingId === targetUserId;

                // Can we delete this user?
                // 1. Cannot delete owner
                // 2. Owner can delete anyone
                // 3. Admin can delete member/viewer but not owner or another admin
                // 4. Any user can leave by themselves (isSelf)
                let canDelete = false;
                if (!isOwner) {
                  if (isSelf) {
                    canDelete = true; // self-leave
                  } else if (currentUserRole === "owner") {
                    canDelete = true;
                  } else if (currentUserRole === "admin" && !isTargetAdmin) {
                    canDelete = true;
                  }
                }

                return (
                  <div
                    key={targetUserId}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "10px 12px",
                      borderRadius: "var(--radius-md)",
                      transition: "background var(--transition-fast)",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <Avatar user={member.user} size="sm" />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        style={{
                          fontSize: 13.5,
                          fontWeight: 600,
                          color: "var(--text-primary)",
                          margin: 0,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {member.user?.name || "Unknown User"} {isSelf && <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>(You)</span>}
                      </p>
                      <p
                        style={{
                          fontSize: 11.5,
                          color: "var(--text-muted)",
                          margin: 0,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {member.user?.email || ""}
                      </p>
                    </div>

                    {/* Role Tag */}
                    <span
                      style={{
                        padding: "4px 10px",
                        borderRadius: 20,
                        fontSize: 11,
                        fontWeight: 600,
                        textTransform: "capitalize",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        background:
                          member.role === "owner"
                            ? "rgba(245, 158, 11, 0.12)"
                            : member.role === "admin"
                            ? "rgba(124, 58, 237, 0.12)"
                            : member.role === "viewer"
                            ? "rgba(59, 130, 246, 0.12)"
                            : "var(--bg-hover)",
                        color:
                          member.role === "owner"
                            ? "var(--accent-amber)"
                            : member.role === "admin"
                            ? "var(--brand-300)"
                            : member.role === "viewer"
                            ? "var(--accent-cyan)"
                            : "var(--text-secondary)",
                      }}
                    >
                      {member.role === "owner" && <Shield size={11} />}
                      {member.role === "admin" && <Shield size={11} />}
                      {member.role}
                    </span>

                    {/* Remove Member Button */}
                    {canDelete && (
                      <button
                        onClick={() => handleRemoveMember(targetUserId)}
                        disabled={isRemoving}
                        title={isSelf ? "Leave workspace" : "Remove from workspace"}
                        style={{
                          background: "transparent",
                          border: "none",
                          cursor: "pointer",
                          color: "var(--text-tertiary)",
                          padding: 6,
                          display: "flex",
                          borderRadius: "var(--radius-sm)",
                          transition: "all var(--transition-fast)",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "rgba(244, 63, 94, 0.1)";
                          e.currentTarget.style.color = "var(--accent-rose)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "transparent";
                          e.currentTarget.style.color = "var(--text-tertiary)";
                        }}
                      >
                        <Trash2 size={13.5} />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Invite Form & Directory */}
        {canInvite && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Invite Form Card */}
            <div
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-xl)",
                padding: 24,
                boxShadow: "var(--shadow-sm)",
              }}
            >
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4, display: "flex", alignItems: "center", gap: 8 }}>
                <UserPlus size={16} className="text-violet-400" />
                Invite Member
              </h3>
              <p style={{ fontSize: 12.5, color: "var(--text-secondary)", marginBottom: 18 }}>
                Send a workspace invitation email or link to a new user
              </p>

              <form onSubmit={handleInvite} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={inviteEmail}
                  onChange={(e) => {
                    setInviteEmail(e.target.value);
                    setActionError("");
                    setInviteResult(null);
                  }}
                    placeholder="colleague@company.com"
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "var(--radius-md)",
                      background: "var(--bg-app)",
                      border: "1.5px solid var(--border-default)",
                      color: "var(--text-primary)",
                      fontSize: 13.5,
                      outline: "none",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>
                    Workspace Role
                  </label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "var(--radius-md)",
                      background: "var(--bg-app)",
                      border: "1.5px solid var(--border-default)",
                      color: "var(--text-primary)",
                      fontSize: 13.5,
                      outline: "none",
                    }}
                  >
                    <option value="member">Member (Can edit lists & cards)</option>
                    {canManage && <option value="admin">Admin (Full workspace control)</option>}
                    <option value="viewer">Viewer (Read-only access)</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={inviting || !inviteEmail.trim()}
                  style={{
                    width: "100%",
                    padding: "10px 16px",
                    borderRadius: "var(--radius-md)",
                    background: "var(--brand-500)",
                    color: "#fff",
                    fontWeight: 600,
                    fontSize: 13.5,
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    transition: "background var(--transition-fast)",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--brand-600)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "var(--brand-500)")}
                >
                  {inviting ? "Sending Invite..." : "Send Invitation"}
                </button>
              </form>

              {/* Invite success display */}
              {inviteResult && inviteResult.success && (
                <div
                  style={{
                    marginTop: 20,
                    padding: 16,
                    borderRadius: "var(--radius-md)",
                    background: "rgba(16, 185, 129, 0.08)",
                    border: "1px solid rgba(16, 185, 129, 0.25)",
                  }}
                >
                  <p style={{ margin: "0 0 8px 0", fontSize: 13, fontWeight: 700, color: "var(--accent-cyan)" }}>
                    Invite Link Generated!
                  </p>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <input
                      type="text"
                      readOnly
                      value={inviteResult.invite?.inviteLink}
                      style={{
                        flex: 1,
                        padding: "6px 10px",
                        borderRadius: 4,
                        background: "var(--bg-app)",
                        border: "1px solid var(--border-subtle)",
                        fontSize: 11,
                        color: "var(--text-secondary)",
                        outline: "none",
                      }}
                    />
                    <button
                      onClick={copyLink}
                      title="Copy invite link"
                      style={{
                        background: "transparent",
                        border: "none",
                        padding: 6,
                        borderRadius: 4,
                        cursor: "pointer",
                        color: "var(--text-secondary)",
                        display: "flex",
                        transition: "all var(--transition-fast)",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "var(--bg-hover)";
                        e.currentTarget.style.color = "var(--text-primary)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.color = "var(--text-secondary)";
                      }}
                    >
                      {copiedLink ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Invite Directory Card */}
            <div
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-xl)",
                padding: 24,
                boxShadow: "var(--shadow-sm)",
              }}
            >
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4, display: "flex", alignItems: "center", gap: 8 }}>
                👤 System Directory
              </h3>
              <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 14 }}>
                Select a registered user to invite them to this workspace
              </p>

              {/* Directory search input */}
              <div style={{ position: "relative", marginBottom: 12 }}>
                <Search
                  size={14}
                  style={{
                    position: "absolute",
                    left: 10,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "var(--text-tertiary)",
                  }}
                />
                <input
                  type="text"
                  placeholder="Search system users…"
                  value={dirSearchQuery}
                  onChange={(e) => setDirSearchQuery(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 10px 8px 30px",
                    borderRadius: "var(--radius-md)",
                    background: "var(--bg-app)",
                    border: "1.5px solid var(--border-default)",
                    color: "var(--text-primary)",
                    fontSize: 13,
                    outline: "none",
                  }}
                />
              </div>

              {/* Users scroll container */}
              <div style={{ maxHeight: 220, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6, paddingRight: 4 }}>
                {loadingUsers ? (
                  <p style={{ textAlign: "center", fontSize: 13, color: "var(--text-muted)", margin: "10px 0" }}>Loading users…</p>
                ) : getInviteableUsers().length === 0 ? (
                  <p style={{ textAlign: "center", fontSize: 13, color: "var(--text-muted)", margin: "10px 0" }}>No matching users found.</p>
                ) : (
                  getInviteableUsers().map((u) => (
                    <div
                      key={u._id}
                      onClick={() => {
                        setInviteEmail(u.email);
                        setActionError("");
                        setInviteResult(null);
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "8px 10px",
                        borderRadius: "var(--radius-md)",
                        background: inviteEmail === u.email ? "rgba(124, 58, 237, 0.08)" : "transparent",
                        border: inviteEmail === u.email ? "1.5px solid rgba(124, 58, 237, 0.3)" : "1.5px solid transparent",
                        cursor: "pointer",
                        transition: "all var(--transition-fast)",
                      }}
                      onMouseEnter={(e) => {
                        if (inviteEmail !== u.email) e.currentTarget.style.background = "var(--bg-hover)";
                      }}
                      onMouseLeave={(e) => {
                        if (inviteEmail !== u.email) e.currentTarget.style.background = "transparent";
                      }}
                    >
                      <Avatar user={u} size="sm" />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {u.name}
                        </p>
                        <p style={{ fontSize: 11.5, color: "var(--text-muted)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {u.email}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MembersPage;
