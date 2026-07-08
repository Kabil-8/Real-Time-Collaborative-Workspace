import React, { useState } from "react";
import { useWorkspace } from "../../context/WorkspaceContext";

export default function CreateWorkspaceModal({ onClose }) {
  const { createWorkspace } = useWorkspace();
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await createWorkspace(name.trim());
      onClose();
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Failed to create workspace");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold mb-4">Create Workspace</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
            <input autoFocus value={name} onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
              placeholder="Acme Team" />
          </div>
          {error && <div className="text-sm text-red-600">{error}</div>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-100">Cancel</button>
            <button type="submit" disabled={submitting} className="rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50">
              {submitting ? "Creating…" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}