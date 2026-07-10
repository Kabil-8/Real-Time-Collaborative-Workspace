import React, { useState } from "react";
import { useParams, useNavigate, Navigate, useLocation } from "react-router-dom";
import api from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { useWorkspace } from "../context/WorkspaceContext";

export default function AcceptInvitePage() {
  const { token } = useParams();
  const { user, loading } = useAuth();
  const { refresh, selectWorkspace } = useWorkspace();
  const navigate = useNavigate();
  const location = useLocation();
  const [status, setStatus] = useState("idle"); // idle | joining | error
  const [error, setError] = useState(null);

  if (loading) return <div className="flex h-screen items-center justify-center text-slate-500">Loading…</div>;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;

  async function accept() {
    setStatus("joining");
    setError(null);
    try {
      const res = await api.post("/workspaces/accept-invite", { token });
      const ws = res.data.data.workspace;
      await refresh();
      if (ws?._id) selectWorkspace(ws._id);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "Invite is invalid or expired");
      setStatus("error");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-sm border border-slate-200 text-center">
        <h1 className="text-xl font-semibold mb-2">Join workspace</h1>
        <p className="text-sm text-slate-600 mb-6">
          You've been invited to join a workspace as <strong>{user.name}</strong> ({user.email}).
        </p>
        {error && <div className="mb-4 rounded-md bg-red-50 text-red-700 px-3 py-2 text-sm">{error}</div>}
        <div className="flex justify-center gap-2">
          <button
            onClick={() => navigate("/")}
            className="rounded-md px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            onClick={accept}
            disabled={status === "joining"}
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {status === "joining" ? "Joining…" : "Accept invite"}
          </button>
        </div>
      </div>
    </div>
  );
}