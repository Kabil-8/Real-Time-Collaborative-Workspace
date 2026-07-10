import React, { useEffect, useState } from "react";
import api from "../utils/api";
import { useWorkspace } from "../context/WorkspaceContext";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function WorkspaceSettings() {
  const { current, refresh, selectWorkspace } = useWorkspace();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [detail, setDetail] = useState(null);
  const [invites, setInvites] = useState([]);
  const [name, setName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const myRole = detail?.members?.find((m) => m.userId === user?._id)?.role;
  const isAdmin = myRole === "owner" || myRole === "admin";

  async function loadAll() {
    if (!current) return;
    const wsRes = await api.get(`/workspaces/${current._id}`);
    setDetail(wsRes.data.data.workspace);
    setName(wsRes.data.data.workspace.name);
    try {
      const invRes = await api.get(`/workspaces/${current._id}/invites`);
      setInvites(invRes.data.data.invites || []);
    } catch {
      setInvites([]); // non-admins can't list invites
    }
  }

  useEffect(() => { loadAll(); /* eslint-disable-next-line */ }, [current?._id]);

  if (!current) return <div className="text-slate-500">Select a workspace first.</div>;

  async function saveName(e) {
    e.preventDefault();
    try {
      await api.patch(`/workspaces/${current._id}`, { name });
      await refresh();
      setMessage("Workspace updated");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update workspace");
    }
  }

  async function sendInvite(e) {
    e.preventDefault();
    setError(null);
    try {
      await api.post(`/workspaces/${current._id}/invite`, { email: inviteEmail, role: inviteRole });
      setMessage(`Invite created for ${inviteEmail}`);
      setInviteEmail("");
      await loadAll();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send invite");
    }
  }

  async function copyInviteLink(token) {
    const url = `${window.location.origin}/invite/${token}`;
    try {
      await navigator.clipboard.writeText(url);
      setMessage("Invite link copied to clipboard");
    } catch {
      setMessage(url);
    }
  }

  async function revokeInvite(token) {
    if (!window.confirm("Revoke this invite?")) return;
    await api.delete(`/workspaces/${current._id}/invites/${token}`);
    await loadAll();
  }

  async function changeRole(userId, role) {
    try {
      await api.patch(`/workspaces/${current._id}/members/${userId}`, { role });
      await loadAll();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to change role");
    }
  }

  async function removeMember(userId) {
    if (!window.confirm("Remove this member from the workspace?")) return;
    try {
      await api.delete(`/workspaces/${current._id}/members/${userId}`);
      await loadAll();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to remove member");
    }
  }

  async function leaveWorkspace() {
    if (!window.confirm(`Leave "${current.name}"?`)) return;
    try {
      await api.delete(`/workspaces/${current._id}/members/${user._id}`);
      selectWorkspace(null);
      await refresh();
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to leave workspace");
    }
  }

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold mb-4">Workspace Settings</h1>
        {message && <div className="mb-4 rounded-md bg-emerald-50 text-emerald-700 px-3 py-2 text-sm">{message}</div>}
        {error && <div className="mb-4 rounded-md bg-red-50 text-red-700 px-3 py-2 text-sm">{error}</div>}
      </div>
      <section className="rounded-lg bg-white p-6 shadow-sm border border-slate-200">
        <h2 className="font-semibold mb-3">Details</h2>
        <form onSubmit={saveName} className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={!isAdmin}
            className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50 disabled:text-slate-500"
          />
          <button
            disabled={!isAdmin}
            className="rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            Save
          </button>
        </form>
      </section>
      <section className="rounded-lg bg-white p-6 shadow-sm border border-slate-200">
        <h2 className="font-semibold mb-3">Members</h2>
        <ul className="divide-y divide-slate-100">
          {(detail?.members || []).map((m) => (
            <li key={m.userId} className="py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">
                  {m.name} {m.userId === user?._id && <span className="text-xs text-slate-400">(you)</span>}
                </div>
                <div className="text-xs text-slate-500 truncate">{m.email}</div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {isAdmin && m.role !== "owner" ? (
                  <select
                    value={m.role}
                    onChange={(e) => changeRole(m.userId, e.target.value)}
                    className="rounded border border-slate-300 px-2 py-1 text-xs"
                  >
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                  </select>
                ) : (
                  <span className="text-xs rounded bg-slate-100 px-2 py-1 text-slate-600 capitalize">{m.role}</span>
                )}
                {m.role !== "owner" && (isAdmin || m.userId === user?._id) && (
                  <button
                    onClick={() => (m.userId === user?._id ? leaveWorkspace() : removeMember(m.userId))}
                    className="text-xs text-red-600 hover:underline"
                  >
                    {m.userId === user?._id ? "Leave" : "Remove"}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>
      {isAdmin && (
        <section className="rounded-lg bg-white p-6 shadow-sm border border-slate-200">
          <h2 className="font-semibold mb-3">Invite member</h2>
          <form onSubmit={sendInvite} className="flex gap-2">
            <input type="email" required value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="teammate@example.com" className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm" />
            <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} className="rounded-md border border-slate-300 px-2 py-2 text-sm">
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
            <button className="rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700">Invite</button>
          </form>
          {invites.length > 0 && (
            <div className="mt-5">
              <h3 className="text-xs font-semibold uppercase text-slate-500 mb-2">Pending invites</h3>
              <ul className="divide-y divide-slate-100">
                {invites.map((inv) => (
                  <li key={inv.token} className="py-2 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm truncate">{inv.email}</div>
                      <div className="text-xs text-slate-500 capitalize">{inv.role}</div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <button onClick={() => copyInviteLink(inv.token)} className="text-xs text-brand-600 hover:underline">
                        Copy link
                      </button>
                      <button onClick={() => revokeInvite(inv.token)} className="text-xs text-red-600 hover:underline">
                        Revoke
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}
    </div>
  );
}