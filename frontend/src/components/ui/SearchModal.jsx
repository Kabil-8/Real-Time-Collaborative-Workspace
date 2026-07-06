/**
 * components/ui/SearchModal.jsx  (enhanced)
 *
 * Global quick-search modal with:
 *   • Debounced search (280 ms)
 *   • Full keyboard navigation: ↑↓ arrows, Enter to open, Esc to close
 *   • Priority filter pills
 *   • Recent searches (localStorage)
 *   • "View all results" footer link → /search?q=...
 */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  Search, X, Trello, LayoutList, Clock, Hash,
  AlertCircle, Calendar, ArrowRight, Loader, Star,
  ExternalLink,
} from "lucide-react";
import api from "../../utils/api";
import { useWorkspace } from "../../context/WorkspaceContext";

// ─── Helpers ────────────────────────────────────────────────────────────────
const PRIORITY_META = {
  critical: { label: "Critical", color: "#ef4444" },
  high:     { label: "High",     color: "#f97316" },
  medium:   { label: "Medium",   color: "#eab308" },
  low:      { label: "Low",      color: "#22c55e" },
  none:     { label: "None",     color: "#6b7280" },
};

const PRIORITY_ORDER = ["critical", "high", "medium", "low"];

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
  if (diff < -1) return { label: `Overdue · ${d.toLocaleDateString()}`, color: "#ef4444" };
  if (diff < 0)  return { label: "Due today",    color: "#f97316" };
  if (diff < 1)  return { label: "Due tomorrow", color: "#eab308" };
  return { label: d.toLocaleDateString(), color: "#6b7280" };
};

// ─── Result row components ───────────────────────────────────────────────────
const BoardResult = ({ board, query, isActive, onClick }) => (
  <button
    onClick={onClick}
    data-active={isActive || undefined}
    className={`search-result-row group ${isActive ? "search-result-active" : ""}`}
  >
    <div
      className="search-result-icon"
      style={{
        background: board.background?.value?.startsWith("linear")
          ? board.background.value
          : `linear-gradient(135deg, #7c3aed, #4f46e5)`,
      }}
    >
      <Trello size={13} className="text-white" />
    </div>
    <div className="flex-1 min-w-0 text-left">
      <p className="search-result-title">{highlight(board.title, query)}</p>
      {board.description && (
        <p className="search-result-sub truncate">{board.description}</p>
      )}
    </div>
    {board.isStarred && <Star size={12} className="text-yellow-400 fill-yellow-400 flex-shrink-0" />}
    <ArrowRight size={13} className="search-result-arrow" />
  </button>
);

const CardResult = ({ card, query, isActive, onClick }) => {
  const prio = PRIORITY_META[card.priority] || PRIORITY_META.none;
  const due  = formatDate(card.dueDate);

  return (
    <button
      onClick={onClick}
      data-active={isActive || undefined}
      className={`search-result-row group ${isActive ? "search-result-active" : ""}`}
    >
      <div className="search-result-icon" style={{ background: card.coverColor || "rgba(124,58,237,0.2)" }}>
        <LayoutList size={13} className="text-white/80" />
      </div>
      <div className="flex-1 min-w-0 text-left">
        <p className="search-result-title">{highlight(card.title, query)}</p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
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
            <span className="search-result-chip" style={{ color: prio.color, borderColor: `${prio.color}40` }}>
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
      <ArrowRight size={13} className="search-result-arrow" />
    </button>
  );
};

// ─── Filter pills ────────────────────────────────────────────────────────────
const PriorityPills = ({ active, onChange }) => (
  <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-slate-800/60 flex-wrap">
    <span className="text-[10px] text-slate-600 font-semibold uppercase tracking-widest mr-1">Priority:</span>
    {PRIORITY_ORDER.map((p) => {
      const meta   = PRIORITY_META[p];
      const isOn   = active === p;
      return (
        <button
          key={p}
          onClick={() => onChange(isOn ? null : p)}
          className="px-2 py-0.5 rounded-full text-[10px] font-semibold border transition-all"
          style={{
            color:       isOn ? "#fff"       : meta.color,
            borderColor: `${meta.color}40`,
            background:  isOn ? meta.color   : `${meta.color}15`,
          }}
        >
          {meta.label}
        </button>
      );
    })}
    {active && (
      <button
        onClick={() => onChange(null)}
        className="text-[10px] text-slate-600 hover:text-slate-300 transition-colors ml-1 flex items-center gap-0.5"
      >
        <X size={9} /> Clear
      </button>
    )}
  </div>
);

// ─── Empty / idle states ────────────────────────────────────────────────────
const EmptyState = ({ query }) => (
  <div className="flex flex-col items-center justify-center py-14 gap-3 text-center">
    <div className="w-14 h-14 rounded-2xl bg-slate-800/60 flex items-center justify-center">
      <Search size={22} className="text-slate-600" />
    </div>
    <div>
      <p className="text-slate-300 font-semibold text-sm">No results for "{query}"</p>
      <p className="text-slate-600 text-xs mt-1">Try different keywords or adjust priority filters</p>
    </div>
  </div>
);

const IdleState = () => (
  <div className="flex flex-col items-center justify-center py-12 gap-3">
    <div className="w-14 h-14 rounded-2xl bg-slate-800/60 flex items-center justify-center">
      <Search size={22} className="text-slate-600" />
    </div>
    <p className="text-slate-500 text-sm">Search boards, cards, and more…</p>
    <div className="flex items-center gap-4 text-[11px] text-slate-700">
      <span className="flex items-center gap-1"><kbd className="kbd-hint">↑↓</kbd> navigate</span>
      <span className="flex items-center gap-1"><kbd className="kbd-hint">↵</kbd> open</span>
      <span className="flex items-center gap-1"><kbd className="kbd-hint">Esc</kbd> close</span>
    </div>
  </div>
);

// ─── Main Modal ──────────────────────────────────────────────────────────────
const SearchModal = ({ onClose }) => {
  const navigate = useNavigate();
  const { activeWorkspace } = useWorkspace();

  const [query, setQuery]           = useState("");
  const [results, setResults]       = useState(null);
  const [loading, setLoading]       = useState(false);
  const [activeIdx, setActiveIdx]   = useState(0);
  const [priorityFilter, setPriority] = useState(null); // null | "critical"|"high"|"medium"|"low"
  const [recentSearches, setRecent] = useState(() => {
    try { return JSON.parse(localStorage.getItem("zaalima_recent_searches") || "[]"); }
    catch { return []; }
  });

  const inputRef      = useRef(null);
  const listRef       = useRef(null);
  const debounceTimer = useRef(null);

  // Focus input on mount
  useEffect(() => { inputRef.current?.focus(); }, []);

  // Keyboard shortcut to close
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // ── Flattened result list for keyboard nav ──────────────────────────────
  const flatResults = useMemo(() => {
    if (!results) return [];
    const boards = (results.boards || []).map((b) => ({ type: "board", data: b }));
    const cards  = (results.cards  || []).map((c) => ({ type: "card",  data: c }));
    return [...boards, ...cards];
  }, [results]);

  // Reset activeIdx when results change
  useEffect(() => { setActiveIdx(0); }, [flatResults]);

  // ── Search API call ─────────────────────────────────────────────────────
  const doSearch = useCallback(
    async (q, prio = priorityFilter) => {
      if (!q.trim()) { setResults(null); setLoading(false); return; }
      setLoading(true);
      try {
        const params = { q, limit: 8 };
        if (activeWorkspace?._id) params.workspaceId = activeWorkspace._id;
        if (prio) params.priority = prio;
        const { data } = await api.get("/search", { params });
        setResults({ boards: data.boards || [], cards: data.cards || [] });
      } catch {
        setResults({ boards: [], cards: [] });
      } finally {
        setLoading(false);
      }
    },
    [activeWorkspace, priorityFilter]
  );

  const handleQueryChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => doSearch(val), 280);
  };

  // Re-run search when priority filter changes
  useEffect(() => {
    if (query.trim()) doSearch(query, priorityFilter);
  }, [priorityFilter]);

  // ── Keyboard navigation ─────────────────────────────────────────────────
  const handleKeyDown = (e) => {
    if (!flatResults.length) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, flatResults.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = flatResults[activeIdx];
      if (item) openResult(item);
    }
  };

  // Keep active item visible
  useEffect(() => {
    const el = listRef.current?.querySelector("[data-active]");
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIdx]);

  // ── Navigation ──────────────────────────────────────────────────────────
  const saveRecent = (text) => {
    const next = [text, ...recentSearches.filter((r) => r !== text)].slice(0, 5);
    setRecent(next);
    localStorage.setItem("zaalima_recent_searches", JSON.stringify(next));
  };

  const openResult = (item) => {
    saveRecent(query);
    if (item.type === "board") {
      navigate(`/boards/${item.data._id}`);
    } else {
      navigate(`/boards/${item.data.board?._id || item.data.board}`);
    }
    onClose();
  };

  const viewAllResults = () => {
    if (query.trim()) {
      saveRecent(query);
      navigate(`/search?q=${encodeURIComponent(query)}${priorityFilter ? `&priority=${priorityFilter}` : ""}`);
    } else {
      navigate("/search");
    }
    onClose();
  };

  const hasBoardResults = results?.boards?.length > 0;
  const hasCardResults  = results?.cards?.length  > 0;
  const isEmpty         = results && !hasBoardResults && !hasCardResults;
  const hasResults      = hasBoardResults || hasCardResults;

  const boardOffset = 0;
  const cardOffset  = results?.boards?.length || 0;
  const totalCount  = (results?.boards?.length || 0) + (results?.cards?.length || 0);

  return (
    <>
      {/* Backdrop */}
      <div className="search-backdrop" onClick={onClose} />

      {/* Modal */}
      <div className="search-modal animate-search-in" role="dialog" aria-label="Search">
        {/* Input */}
        <div className="search-input-wrap">
          {loading
            ? <Loader size={16} className="text-violet-400 animate-spin flex-shrink-0" />
            : <Search size={16} className="text-slate-500 flex-shrink-0" />
          }
          <input
            ref={inputRef}
            id="global-search-input"
            value={query}
            onChange={handleQueryChange}
            onKeyDown={handleKeyDown}
            placeholder="Search boards, cards…"
            className="search-input"
            autoComplete="off"
            spellCheck={false}
          />
          {query && (
            <button
              onClick={() => { setQuery(""); setResults(null); inputRef.current?.focus(); }}
              className="p-1 rounded-md text-slate-600 hover:text-slate-300 transition-colors"
            >
              <X size={14} />
            </button>
          )}
          <kbd className="kbd-hint ml-1">Esc</kbd>
        </div>

        {/* Priority filter pills */}
        <PriorityPills active={priorityFilter} onChange={setPriority} />

        {/* Results body */}
        <div ref={listRef} className="search-results-body">
          {/* Idle — show recent searches */}
          {!query && (
            recentSearches.length > 0 ? (
              <div>
                <p className="search-section-label">
                  <Clock size={11} /> Recent searches
                </p>
                {recentSearches.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => { setQuery(s); doSearch(s); }}
                    className="search-result-row group"
                  >
                    <div className="search-result-icon bg-slate-800">
                      <Clock size={13} className="text-slate-500" />
                    </div>
                    <span className="flex-1 text-left text-sm text-slate-400 group-hover:text-slate-200 transition-colors">
                      {s}
                    </span>
                    <X
                      size={12}
                      className="text-slate-700 hover:text-slate-400 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        const next = recentSearches.filter((r) => r !== s);
                        setRecent(next);
                        localStorage.setItem("zaalima_recent_searches", JSON.stringify(next));
                      }}
                    />
                  </button>
                ))}
              </div>
            ) : (
              <IdleState />
            )
          )}

          {/* Loading skeleton */}
          {query && loading && !results && (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="w-8 h-8 rounded-lg bg-slate-800" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-slate-800 rounded w-1/2" />
                    <div className="h-2.5 bg-slate-800/60 rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty */}
          {isEmpty && <EmptyState query={query} />}

          {/* Board results */}
          {hasBoardResults && (
            <div>
              <p className="search-section-label"><Trello size={11} /> Boards</p>
              {results.boards.map((board, i) => (
                <BoardResult
                  key={board._id}
                  board={board}
                  query={query}
                  isActive={boardOffset + i === activeIdx}
                  onClick={() => openResult({ type: "board", data: board })}
                />
              ))}
            </div>
          )}

          {/* Card results */}
          {hasCardResults && (
            <div>
              <p className="search-section-label"><LayoutList size={11} /> Cards</p>
              {results.cards.map((card, i) => (
                <CardResult
                  key={card._id}
                  card={card}
                  query={query}
                  isActive={cardOffset + i === activeIdx}
                  onClick={() => openResult({ type: "card", data: card })}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="search-footer">
          <span>
            {hasResults
              ? `${totalCount} result${totalCount !== 1 ? "s" : ""}`
              : query && !loading
              ? "No results"
              : "Type to search"}
          </span>
          <div className="flex items-center gap-3">
            {hasResults && (
              <button
                onClick={viewAllResults}
                className="flex items-center gap-1.5 text-[11px] text-violet-400
                  hover:text-violet-300 transition-colors"
              >
                <ExternalLink size={10} />
                View all results
              </button>
            )}
            {hasResults && (
              <>
                <span className="flex items-center gap-1"><kbd className="kbd-hint">↑↓</kbd> navigate</span>
                <span className="flex items-center gap-1"><kbd className="kbd-hint">↵</kbd> open</span>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default SearchModal;
