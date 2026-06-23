import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Search, Trello, LayoutList, Hash, Clock, AlertCircle,
  Calendar, Filter, X, Loader, Star, SlidersHorizontal,
} from "lucide-react";
import api from "../utils/api";
import { useWorkspace } from "../context/WorkspaceContext";

// ─── Helpers ────────────────────────────────────────────────────────────────
const PRIORITY_META = {
  critical: { label: "Critical", color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
  high:     { label: "High",     color: "#f97316", bg: "rgba(249,115,22,0.12)" },
  medium:   { label: "Medium",   color: "#eab308", bg: "rgba(234,179,8,0.12)" },
  low:      { label: "Low",      color: "#22c55e", bg: "rgba(34,197,94,0.12)" },
  none:     { label: "None",     color: "#6b7280", bg: "rgba(107,114,128,0.12)" },
};

const highlight = (text = "", query = "") => {
  if (!query.trim()) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "gi"));
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <mark key={i} className="search-highlight">{part}</mark>
    ) : part
  );
};

const formatDate = (date) => {
  if (!date) return null;
  const d = new Date(date);
  const now = new Date();
  const diff = (d - now) / (1000 * 60 * 60 * 24);
  if (diff < -1) return { label: `Overdue`, color: "#ef4444" };
  if (diff < 0)  return { label: "Due today", color: "#f97316" };
  if (diff < 1)  return { label: "Due tomorrow", color: "#eab308" };
  return { label: d.toLocaleDateString(), color: "#6b7280" };
};

// ─── Board card ──────────────────────────────────────────────────────────────
const BoardCard = ({ board, query, onClick }) => (
  <button
    onClick={onClick}
    className="search-page-card group text-left w-full"
  >
    <div
      className="search-page-card-cover"
      style={{
        background: board.background?.value?.startsWith("linear")
          ? board.background.value
          : "linear-gradient(135deg, #7c3aed, #4f46e5)",
      }}
    >
      <Trello size={20} className="text-white/80" />
      {board.isStarred && (
        <Star size={12} className="text-yellow-300 fill-yellow-300 absolute top-2 right-2" />
      )}
    </div>
    <div className="p-3">
      <p className="text-sm font-semibold text-slate-100 truncate group-hover:text-violet-300 transition-colors">
        {highlight(board.title, query)}
      </p>
      {board.description && (
        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{board.description}</p>
      )}
    </div>
  </button>
);

// ─── Card row ────────────────────────────────────────────────────────────────
const CardRow = ({ card, query, onClick }) => {
  const prio = PRIORITY_META[card.priority] || PRIORITY_META.none;
  const due  = formatDate(card.dueDate);

  return (
    <button
      onClick={onClick}
      className="search-page-card-row group text-left w-full"
    >
      {card.coverColor && (
        <div className="w-1 self-stretch rounded-full flex-shrink-0" style={{ background: card.coverColor }} />
      )}
      <div className="flex-1 min-w-0 py-2 pl-3">
        <p className="text-sm font-medium text-slate-200 group-hover:text-violet-300 transition-colors truncate">
          {highlight(card.title, query)}
        </p>
        {card.description && (
          <p className="text-xs text-slate-600 mt-0.5 line-clamp-1">{card.description}</p>
        )}
        <div className="flex items-center flex-wrap gap-2 mt-1.5">
          {card.board?.title && (
            <span className="search-result-chip">
              <Trello size={9} /> {card.board.title}
            </span>
          )}
          {card.list?.title && (
            <span className="search-result-chip">
              <Hash size={9} /> {card.list.title}
            </span>
          )}
          {card.priority && card.priority !== "none" && (
            <span
              className="search-result-chip"
              style={{ color: prio.color, borderColor: `${prio.color}40`, background: prio.bg }}
            >
              <AlertCircle size={9} /> {prio.label}
            </span>
          )}
          {due && (
            <span className="search-result-chip" style={{ color: due.color, borderColor: `${due.color}40` }}>
              <Calendar size={9} /> {due.label}
            </span>
          )}
        </div>
      </div>
      {card.assignees?.length > 0 && (
        <div className="flex -space-x-1.5 pr-3 flex-shrink-0">
          {card.assignees.slice(0, 3).map((a) => (
            <div
              key={a._id}
              title={a.name}
              className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold
                text-white ring-1 ring-slate-900 flex-shrink-0"
              style={{ background: `linear-gradient(135deg, ${a.avatarColor || "#7c3aed"}, ${a.avatarColor || "#4f46e5"}88)` }}
            >
              {a.name?.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()}
            </div>
          ))}
        </div>
      )}
    </button>
  );
};

// ─── Filter bar ─────────────────────────────────────────────────────────────
const FILTER_OPTIONS = [
  { id: "all",    label: "All" },
  { id: "boards", label: "Boards" },
  { id: "cards",  label: "Cards" },
];

const FilterBar = ({ active, onChange, boardCount, cardCount }) => (
  <div className="flex items-center gap-2">
    {FILTER_OPTIONS.map((opt) => (
      <button
        key={opt.id}
        onClick={() => onChange(opt.id)}
        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
          active === opt.id
            ? "bg-violet-600 text-white shadow-sm"
            : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
        }`}
      >
        {opt.label}
        {opt.id === "boards" && boardCount != null && (
          <span className="ml-1.5 opacity-60">{boardCount}</span>
        )}
        {opt.id === "cards" && cardCount != null && (
          <span className="ml-1.5 opacity-60">{cardCount}</span>
        )}
      </button>
    ))}
  </div>
);

// ─── SearchPage ──────────────────────────────────────────────────────────────
const SearchPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { activeWorkspace } = useWorkspace();

  const [query,   setQuery]   = useState(searchParams.get("q") || "");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filter,  setFilter]  = useState("all");

  const inputRef     = useRef(null);
  const debounceRef  = useRef(null);

  const doSearch = useCallback(async (q) => {
    if (!q.trim()) { setResults(null); setLoading(false); return; }
    setLoading(true);
    try {
      const params = { q };
      if (activeWorkspace?._id) params.workspaceId = activeWorkspace._id;
      const { data } = await api.get("/search", { params });
      setResults({ boards: data.boards || [], cards: data.cards || [] });
    } catch {
      setResults({ boards: [], cards: [] });
    } finally {
      setLoading(false);
    }
  }, [activeWorkspace]);

  const initialQuery = useRef(searchParams.get("q") || "");

  // Run search on mount if q param exists
  useEffect(() => {
    if (initialQuery.current) doSearch(initialQuery.current);
  }, [doSearch]);


  const handleChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearchParams(val ? { q: val } : {}, { replace: true });
      doSearch(val);
    }, 300);
  };

  const clearSearch = () => {
    setQuery("");
    setResults(null);
    setSearchParams({}, { replace: true });
    inputRef.current?.focus();
  };

  // Filtered results
  const filteredBoards = filter !== "cards" ? (results?.boards || []) : [];
  const filteredCards  = filter !== "boards" ? (results?.cards  || []) : [];
  const totalCount     = filteredBoards.length + filteredCards.length;
  const hasResults     = results && (results.boards.length > 0 || results.cards.length > 0);

  return (
    <div className="min-h-full bg-slate-950 px-6 py-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
          <Search size={22} className="text-violet-400" />
          Search
        </h1>
        <p className="text-slate-500 text-sm">
          Find boards, cards, and more across your workspace
        </p>
      </div>

      {/* Search input */}
      <div className="relative mb-6">
        <div className="absolute left-4 top-1/2 -translate-y-1/2">
          {loading
            ? <Loader size={18} className="text-violet-400 animate-spin" />
            : <Search size={18} className="text-slate-500" />
          }
        </div>
        <input
          ref={inputRef}
          id="search-page-input"
          value={query}
          onChange={handleChange}
          placeholder="Search boards, cards, descriptions…"
          className="w-full pl-11 pr-10 py-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/50
            text-slate-100 placeholder-slate-600 text-sm
            focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/50
            transition-all"
          autoComplete="off"
          autoFocus
        />
        {query && (
          <button
            onClick={clearSearch}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg
              text-slate-600 hover:text-slate-300 hover:bg-slate-700/60 transition-all"
          >
            <X size={15} />
          </button>
        )}
      </div>

      {/* Filter bar + count */}
      {hasResults && (
        <div className="flex items-center justify-between mb-5">
          <FilterBar
            active={filter}
            onChange={setFilter}
            boardCount={results.boards.length}
            cardCount={results.cards.length}
          />
          <span className="text-xs text-slate-600">
            {totalCount} result{totalCount !== 1 ? "s" : ""}
          </span>
        </div>
      )}

      {/* Results */}
      {!query && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-16 h-16 rounded-2xl bg-slate-800/60 flex items-center justify-center">
            <SlidersHorizontal size={24} className="text-slate-600" />
          </div>
          <p className="text-slate-500 text-sm">Start typing to search…</p>
        </div>
      )}

      {query && loading && !results && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader size={28} className="text-violet-500 animate-spin" />
          <p className="text-slate-500 text-sm">Searching…</p>
        </div>
      )}

      {query && results && totalCount === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-800/60 flex items-center justify-center">
            <Search size={24} className="text-slate-600" />
          </div>
          <p className="text-slate-300 font-semibold">No results for "{query}"</p>
          <p className="text-slate-600 text-sm">Try different keywords or check your workspace</p>
        </div>
      )}

      {/* Board results */}
      {filteredBoards.length > 0 && (
        <section className="mb-8">
          <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-600 mb-3">
            <Trello size={12} /> Boards ({filteredBoards.length})
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {filteredBoards.map((board) => (
              <BoardCard
                key={board._id}
                board={board}
                query={query}
                onClick={() => navigate(`/boards/${board._id}`)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Card results */}
      {filteredCards.length > 0 && (
        <section>
          <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-600 mb-3">
            <LayoutList size={12} /> Cards ({filteredCards.length})
          </h2>
          <div className="space-y-2">
            {filteredCards.map((card) => (
              <CardRow
                key={card._id}
                card={card}
                query={query}
                onClick={() => navigate(`/boards/${card.board?._id || card.board}`)}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default SearchPage;
