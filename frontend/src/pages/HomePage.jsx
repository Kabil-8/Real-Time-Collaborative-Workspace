import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import api from "../utils/api";
import { useWorkspace } from "../context/WorkspaceContext";

export default function HomePage() {
  const { current } = useWorkspace();
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");

  const load = useCallback(async () => {
    if (!current) { setBoards([]); return; }
    setLoading(true);
    try {
      const res = await api.get(`/boards/workspace/${current._id}`);
      setBoards(res.data.data.boards || []);
    } finally { setLoading(false); }
  }, [current]);

  useEffect(() => { load(); }, [load]);

  async function handleCreate(e) {
    e.preventDefault();
    if (!newName.trim() || !current) return;
    const res = await api.post(`/boards/workspace/${current._id}`, { name: newName.trim() });
    setBoards((prev) => [res.data.data.board, ...prev]);
    setNewName(""); setShowNew(false);
  }

  if (!current) {
    return <div className="text-center text-slate-500 py-20">Create or select a workspace to get started.</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Boards</h1>
          <p className="text-sm text-slate-500">Workspace: {current.name}</p>
        </div>
        <button onClick={() => setShowNew((v) => !v)} className="rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700">+ New Board</button>
      </div>
      {showNew && (
        <form onSubmit={handleCreate} className="mb-6 flex gap-2">
          <input autoFocus value={newName} onChange={(e) => setNewName(e.target.value)}
            placeholder="Board name" className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <button type="submit" className="rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700">Create</button>
        </form>
      )}
      {loading ? (
        <div className="text-slate-500">Loading boards…</div>
      ) : boards.length === 0 ? (
        <div className="text-center text-slate-500 py-20 border-2 border-dashed border-slate-200 rounded-lg">
          No boards yet. Create your first one.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {boards.map((b) => (
            <Link
              key={b._id}
              to={`/board/${b._id}`}
              className="block rounded-lg bg-white p-5 shadow-sm border border-slate-200 hover:shadow-md hover:border-brand-300 transition"
            >
              <h3 className="font-semibold text-slate-900">{b.name}</h3>
              {b.description && <p className="mt-1 text-sm text-slate-500">{b.description}</p>}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
