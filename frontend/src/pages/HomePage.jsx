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
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState({ boards: [], cards: [] });
  const [searching, setSearching] = useState(false);

  const load = useCallback(async () => {
    if (!current) { setBoards([]); return; }
    setLoading(true);
    try {
      const res = await api.get(`/boards/workspace/${current._id}`);
      setBoards(res.data.data.boards || []);
    } finally { setLoading(false); }
  }, [current]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const query = search.trim();
    if (!current || query.length < 2) {
      setSearchResults({ boards: [], cards: [] });
      setSearching(false);
      return undefined;
    }
    let active = true;
    const timeout = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await api.get(`/workspaces/${current._id}/search`, { params: { q: query } });
        if (active) setSearchResults(res.data.data);
      } catch {
        if (active) setSearchResults({ boards: [], cards: [] });
      } finally {
        if (active) setSearching(false);
      }
    }, 250);
    return () => { active = false; clearTimeout(timeout); };
  }, [current, search]);

  async function handleCreate(e) {
    e.preventDefault();
    if (!newName.trim() || !current) return;
    const res = await api.post(`/boards/workspace/${current._id}`, { name: newName.trim() });
    setBoards((prev) => [res.data.data.board, ...prev]);
    setNewName(""); setShowNew(false);
  }

  if (!current) {
    return <div className="surface rounded-2xl py-20 text-center text-slate-500">Create or select a workspace to get started.</div>;
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Boards</h1>
          <p className="text-sm text-slate-500">Workspace: {current.name}</p>
        </div>
        <button onClick={() => setShowNew((v) => !v)} className="primary-button">+ New Board</button>
      </div>
      <div className="mb-6">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search boards and cards…"
          className="w-full rounded-xl border border-slate-200 bg-white/90 px-4 py-3 text-sm shadow-soft placeholder:text-slate-400 focus:border-brand-500"
        />
        {search.trim().length >= 2 && (
          <div className="surface mt-2 rounded-xl p-3 animate-fade-up">
            {searching ? <p className="text-sm text-slate-500">Searching…</p> : (
              <>
                {searchResults.boards?.length === 0 && searchResults.cards?.length === 0 && <p className="text-sm text-slate-500">No matching boards or cards.</p>}
                {searchResults.boards?.map((board) => (
                  <Link key={board._id} to={`/board/${board._id}`} className="block rounded px-2 py-1.5 text-sm hover:bg-slate-50">
                    <span className="font-medium">Board: </span>{board.name}
                  </Link>
                ))}
                {searchResults.cards?.map((card) => (
                  <Link key={card._id} to={`/board/${card.boardId}`} className="block rounded px-2 py-1.5 text-sm hover:bg-slate-50">
                    <span className="font-medium">Card: </span>{card.title}
                  </Link>
                ))}
              </>
            )}
          </div>
        )}
      </div>
      {showNew && (
        <form onSubmit={handleCreate} className="surface mb-6 flex gap-2 rounded-xl p-3 animate-fade-up">
          <input autoFocus value={newName} onChange={(e) => setNewName(e.target.value)}
            placeholder="Board name" className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <button type="submit" className="primary-button">Create</button>
        </form>
      )}
      {loading ? (
        <div className="text-slate-500">Loading boards…</div>
      ) : boards.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-brand-200 bg-white/60 py-20 text-center text-slate-500">
          No boards yet. Create your first one.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {boards.map((b) => (
            <Link
              key={b._id}
              to={`/board/${b._id}`}
            className="group block rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-soft transition duration-300 hover:-translate-y-1 hover:border-brand-300 hover:shadow-float"
            >
              <div className="mb-5 flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-sm font-bold text-brand-700 transition group-hover:bg-brand-600 group-hover:text-white">{b.name.slice(0, 1).toUpperCase()}</div>
              <h3 className="font-semibold text-slate-900">{b.name}</h3>
              {b.description && <p className="mt-1 text-sm text-slate-500">{b.description}</p>}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
