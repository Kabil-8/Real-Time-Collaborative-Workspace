import React, { useState, useEffect, useCallback } from "react";
import {
  Search, X, LayoutList, Trello, Clock, Flag,
  User, ChevronRight, AlertCircle, Loader2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useWorkspace } from "../context/WorkspaceContext";
import api from "../utils/api";
import useDebounce from "../hooks/useDebounce";

// ─── Priority badge ────────────────────────────────────────────────────────────
const PRIORITY_COLORS = {
  critical: "#ef4444",
  high:     "#f97316",
  medium:   "#eab308",
  low:      "#22c55e",
  none:     "#6b7280",
};

const PriorityBadge = ({ priority }) => {
  if (!priority || priority === "none") return null;
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: "2px 7px",
      borderRadius: 20, letterSpacing: ".04em", textTransform: "uppercase",
      background: PRIORITY_COLORS[priority] + "22",
      color: PRIORITY_COLORS[priority], flexShrink: 0,
    }}>
      {priority}
    </span>
  );
};

// ─── Board result card ─────────────────────────────────────────────────────────
const BoardResult = ({ board, onClick }) => (
  <button
    onClick={onClick}
    style={{
      display: "flex", alignItems: "center", gap: 14,
      padding: "12px 16px", borderRadius: "var(--radius-lg)",
      background: "var(--bg-card)", border: "1px solid var(--border-subtle)",
      cursor: "pointer", width: "100%", textAlign: "left",
      transition: "all var(--duration-fast)",
    }}
    onMouseEnter={e => {
      e.currentTarget.style.background = "var(--bg-hover)";
      e.currentTarget.style.borderColor = "var(--border-focus)";
      e.currentTarget.style.transform = "translateX(2px)";
    }}
    onMouseLeave={e => {
      e.currentTarget.style.background = "var(--bg-card)";
      e.currentTarget.style.borderColor = "var(--border-subtle)";
      e.currentTarget.style.transform = "translateX(0)";
    }}
  >
    {/* Board mini-preview */}
    <div style={{
      width: 40, height: 40, borderRadius: "var(--radius-md)", flexShrink: 0,
      background: board.background?.value || "linear-gradient(135deg,#667eea,#764ba2)",
      boxShadow: "var(--shadow-sm)",
    }} />
    <div style={{ flex: 1, minWidth: 0 }}>
      <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", margin: 0, marginBottom: 2 }}>
        {board.title}
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
          {board.workspace?.name || "Workspace"}
        </span>
        {board.description && (
          <span style={{ fontSize: 12, color: "var(--text-muted)", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", maxWidth: 220 }}>
            · {board.description}
          </span>
        )}
      </div>
    </div>
    <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text-tertiary)", fontSize: 12, flexShrink: 0 }}>
      <Clock size={11} />
      {new Date(board.lastActivity || board.updatedAt).toLocaleDateString("en-US", {
        month: "short", day: "numeric",
      })}
      <ChevronRight size={14} style={{ opacity: 0.5 }} />
    </div>
  </button>
);

// ─── Card result item ─────────────────────────────────────────────────────────
const CardResult = ({ card, onClick }) => {
  const isOverdue = card.dueDate && new Date(card.dueDate) < new Date();
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 14,
        padding: "12px 16px", borderRadius: "var(--radius-lg)",
        background: "var(--bg-card)", border: "1px solid var(--border-subtle)",
        cursor: "pointer", width: "100%", textAlign: "left",
        transition: "all var(--duration-fast)",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = "var(--bg-hover)";
        e.currentTarget.style.borderColor = "var(--border-focus)";
        e.currentTarget.style.transform = "translateX(2px)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = "var(--bg-card)";
        e.currentTarget.style.borderColor = "var(--border-subtle)";
        e.currentTarget.style.transform = "translateX(0)";
      }}
    >
      {/* Card icon */}
      <div style={{
        width: 40, height: 40, borderRadius: "var(--radius-md)", flexShrink: 0,
        background: "var(--bg-surface)", border: "1px solid var(--border-subtle)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <LayoutList size={18} style={{ color: "var(--brand-500)" }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", margin: 0, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
            {card.title}
          </p>
          <PriorityBadge priority={card.priority} />
        </div>
        {/* Breadcrumb */}
        <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--text-tertiary)" }}>
          <Trello size={10} />
          <span>{card.board?.title}</span>
          {card.list?.title && (
            <>
              <ChevronRight size={10} />
              <span>{card.list.title}</span>
            </>
          )}
        </div>
      </div>
      {/* Right meta */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
        {card.dueDate && (
          <span style={{
            fontSize: 11, fontWeight: 600,
            color: isOverdue ? "#ef4444" : "var(--text-tertiary)",
            display: "flex", alignItems: "center", gap: 3,
          }}>
            <Clock size={10} />
            {new Date(card.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </span>
        )}
        {card.assignees?.length > 0 && (
          <div style={{ display: "flex" }}>
            {card.assignees.slice(0, 3).map((a) => (
              <div key={a._id} title={a.name} style={{
                width: 20, height: 20, borderRadius: "50%", marginLeft: -4,
                backgroundColor: a.avatarColor || "#8b5cf6",
                border: "1.5px solid var(--bg-card)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 9, fontWeight: 700, color: "#fff",
              }}>
                {a.name?.[0]?.toUpperCase()}
              </div>
            ))}
          </div>
        )}
      </div>
    </button>
  );
};

// ─── Skeleton loader ──────────────────────────────────────────────────────────
const SkeletonRow = () => (
  <div className="skeleton" style={{ height: 66, borderRadius: "var(--radius-lg)" }} />
);

// ─── Main SearchPage ──────────────────────────────────────────────────────────
const TABS = [
  { id: "all",    label: "All" },
  { id: "boards", label: "Boards", icon: Trello },
  { id: "cards",  label: "Cards",  icon: LayoutList },
];

const SearchPage = () => {
  const [query, setQuery]         = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [results, setResults]     = useState({ boards: [], cards: [] });
  const [counts, setCounts]       = useState({ boards: 0, cards: 0, total: 0 });
  const [loading, setLoading]     = useState(false);
  const [searched, setSearched]   = useState(false);
  const [error, setError]         = useState(null);

  const { activeWorkspace } = useWorkspace();
  const navigate = useNavigate();
  const debouncedQuery = useDebounce(query, 380);

  const doSearch = useCallback(async (q, tab) => {
    if (!q.trim() || q.trim().length < 2) return;
    setLoading(true);
    setSearched(true);
    setError(null);
    try {
      const params = new URLSearchParams({ q: q.trim(), type: tab });
      if (activeWorkspace) params.set("workspaceId", activeWorkspace._id);
      const { data } = await api.get(`/search?${params.toString()}`);
      setResults(data.results || { boards: [], cards: [] });
      setCounts(data.counts || { boards: 0, cards: 0, total: 0 });
    } catch (err) {
      setError("Search failed. Please try again.");
      setResults({ boards: [], cards: [] });
    } finally {
      setLoading(false);
    }
  }, [activeWorkspace]);

  useEffect(() => {
    if (debouncedQuery.trim().length >= 2) {
      doSearch(debouncedQuery, activeTab);
    } else if (!debouncedQuery.trim()) {
      setResults({ boards: [], cards: [] });
      setSearched(false);
    }
  }, [debouncedQuery, activeTab, doSearch]);

  const clearSearch = () => {
    setQuery("");
    setResults({ boards: [], cards: [] });
    setSearched(false);
    setError(null);
  };

  const totalResults =
    (activeTab === "all"    ? counts.total  :
     activeTab === "boards" ? counts.boards :
     counts.cards) || 0;

  const visibleBoards = activeTab === "all" || activeTab === "boards" ? results.boards || [] : [];
  const visibleCards  = activeTab === "all" || activeTab === "cards"  ? results.cards  || [] : [];

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "36px 24px" }}>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--text-primary)", marginBottom: 4 }}>
          Search
        </h1>
        <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
          Find boards and cards across {activeWorkspace?.name || "your workspace"}
        </p>
      </div>

      {/* ── Search bar ─────────────────────────────────────────────────────── */}
      <div style={{ position: "relative", marginBottom: 20 }}>
        {loading
          ? <Loader2 size={18} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%) rotate(0deg)", color: "var(--brand-500)", animation: "spin 1s linear infinite", pointerEvents: "none" }} />
          : <Search size={18} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--text-tertiary)", pointerEvents: "none" }} />
        }
        <input
          id="search-input"
          autoFocus
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search boards, cards, members…"
          style={{
            width: "100%", padding: "13px 44px",
            borderRadius: "var(--radius-lg)",
            background: "var(--bg-card)", border: "1.5px solid var(--border-default)",
            color: "var(--text-primary)", fontSize: 15, fontFamily: "inherit",
            outline: "none", boxSizing: "border-box",
            boxShadow: "var(--shadow-sm)",
            transition: "border-color var(--duration-fast), box-shadow var(--duration-fast)",
          }}
          onFocus={e => {
            e.target.style.borderColor = "var(--border-focus)";
            e.target.style.boxShadow = "0 0 0 3px rgba(139,92,246,.15)";
          }}
          onBlur={e => {
            e.target.style.borderColor = "var(--border-default)";
            e.target.style.boxShadow = "var(--shadow-sm)";
          }}
        />
        {query && (
          <button
            id="search-clear-btn"
            onClick={clearSearch}
            style={{
              position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
              background: "transparent", border: "none", cursor: "pointer",
              color: "var(--text-tertiary)", display: "flex", padding: 4, borderRadius: "var(--radius-sm)",
            }}
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* ── Tabs ───────────────────────────────────────────────────────────── */}
      {searched && (
        <div style={{
          display: "flex", gap: 4,
          borderBottom: "1px solid var(--border-subtle)",
          marginBottom: 20, paddingBottom: 2,
        }}>
          {TABS.map((tab) => {
            const count =
              tab.id === "all" ? counts.total :
              tab.id === "boards" ? counts.boards : counts.cards;
            return (
              <button
                key={tab.id}
                id={`search-tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  position: "relative", padding: "9px 16px",
                  background: "transparent", border: "none",
                  color: activeTab === tab.id ? "var(--text-primary)" : "var(--text-secondary)",
                  fontWeight: activeTab === tab.id ? 700 : 500,
                  fontSize: 14, cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 6,
                  transition: "color var(--duration-fast)",
                }}
              >
                {tab.label}
                {count > 0 && (
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: "1px 6px",
                    borderRadius: 10, minWidth: 20, textAlign: "center",
                    background: activeTab === tab.id ? "var(--brand-500)" : "var(--bg-hover)",
                    color: activeTab === tab.id ? "#fff" : "var(--text-secondary)",
                    transition: "all var(--duration-fast)",
                  }}>
                    {count}
                  </span>
                )}
                {activeTab === tab.id && (
                  <div style={{
                    position: "absolute", bottom: -3, left: 0, right: 0,
                    height: 2, background: "var(--brand-500)", borderRadius: 2,
                  }} />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Error ──────────────────────────────────────────────────────────── */}
      {error && (
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "12px 16px", borderRadius: "var(--radius-md)",
          background: "#ef444420", border: "1px solid #ef444440",
          color: "#ef4444", fontSize: 14, marginBottom: 16,
        }}>
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* ── Loading skeletons ───────────────────────────────────────────────── */}
      {loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[1, 2, 3, 4].map(i => <SkeletonRow key={i} />)}
        </div>
      )}

      {/* ── No results ─────────────────────────────────────────────────────── */}
      {!loading && searched && totalResults === 0 && !error && (
        <div style={{ textAlign: "center", padding: "52px 0" }}>
          <div style={{
            width: 72, height: 72, borderRadius: "var(--radius-xl)",
            background: "var(--bg-card)", border: "1px solid var(--border-subtle)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 16px", fontSize: 32,
          }}>
            🔍
          </div>
          <p style={{ fontSize: 15, color: "var(--text-secondary)", fontWeight: 600 }}>
            No results for "{query}"
          </p>
          <p style={{ fontSize: 13, color: "var(--text-tertiary)", marginTop: 4 }}>
            Try a different keyword or check your spelling
          </p>
        </div>
      )}

      {/* ── Results ────────────────────────────────────────────────────────── */}
      {!loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Boards section */}
          {visibleBoards.length > 0 && (
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                <Trello size={12} /> Boards · {visibleBoards.length}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {visibleBoards.map(b => (
                  <BoardResult key={b._id} board={b} onClick={() => navigate(`/boards/${b._id}`)} />
                ))}
              </div>
            </div>
          )}

          {/* Cards section */}
          {visibleCards.length > 0 && (
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                <LayoutList size={12} /> Cards · {visibleCards.length}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {visibleCards.map(c => (
                  <CardResult key={c._id} card={c} onClick={() => navigate(`/boards/${c.board?._id}`)} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Empty state (not yet searched) ─────────────────────────────────── */}
      {!searched && !loading && (
        <div style={{ textAlign: "center", padding: "64px 0" }}>
          <div style={{
            width: 72, height: 72, borderRadius: "var(--radius-xl)",
            background: "linear-gradient(135deg, var(--brand-500), #6366f1)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 20px", boxShadow: "0 8px 24px rgba(139,92,246,.3)",
          }}>
            <Search size={28} style={{ color: "#fff" }} />
          </div>
          <p style={{ fontSize: 16, color: "var(--text-secondary)", fontWeight: 600 }}>
            Start typing to search
          </p>
          <p style={{ fontSize: 13, color: "var(--text-tertiary)", marginTop: 6 }}>
            Search across boards and cards in {activeWorkspace?.name || "your workspace"}
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 20, flexWrap: "wrap" }}>
            {["card title", "board name", "description"].map(hint => (
              <span key={hint} style={{
                padding: "5px 12px", borderRadius: 20,
                background: "var(--bg-card)", border: "1px solid var(--border-subtle)",
                fontSize: 12, color: "var(--text-tertiary)",
              }}>
                Search by {hint}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchPage;
