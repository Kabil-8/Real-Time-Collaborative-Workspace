import React, { useEffect, useState } from "react";
import api from "../utils/api";
import { useWorkspace } from "../context/WorkspaceContext";

export default function WorkspaceSettings() {
  const { current, refresh } = useWorkspace();
  const [detail, setDetail] = useState(null);
  const [name, setName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [message, setMessage] = useState(null);

  useEffect(() => {
    if (!current) return;
    api.get(`/workspaces/${current._id}`).then((res) => {
      setDetail(res.data.data.workspace);
      setName(res.data.data.workspace.name);
    });
  }, [current]);

  if (!current) return <div className="text-slate-500">Select a workspace first.</div>;

  async function saveName(e) {
    e.preventDefault();
    await api.patch(`/workspaces/${current._id}`, { name });
    await refresh();
    setMessage("Workspace updated");
  }

  async function sendInvite(e) {
    e.preventDefault();
    const res = await api.post(`/workspaces/${current._id}/invite`, { email: inviteEmail, role: inviteRole });
    setMessage(`Invite created. Token: ${res.data.data.token}`);
    setInviteEmail("");
  }

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold mb-4">Workspace Settings</h1>
        {message && <div className="mb-4 rounded-md bg-emerald-50 text-emerald-700 px-3 py-2 text-sm">{message}</div>}
      </div>
      <section className="rounded-lg bg-white p-6 shadow-sm border border-slate-200">
        <h2 className="font-semibold mb-3">Details</h2>
        <form onSubmit={saveName} className="flex gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <button className="rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700">Save</button>
        </form>
      </section>
      <section className="rounded-lg bg-white p-6 shadow-sm border border-slate-200">
        <h2 className="font-semibold mb-3">Members</h2>
        <ul className="divide-y divide-slate-100">
          {(detail?.members || []).map((m) => (
            <li key={m.userId} className="py-2 flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">{m.name}</div>
                <div className="text-xs text-slate-500">{m.email}</div>
              </div>
              <span className="text-xs rounded bg-slate-100 px-2 py-1 text-slate-600">{m.role}</span>
            </li>
          ))}
        </ul>
      </section>
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
      </section>
    </div>
  );
}