import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  X, Flag, Clock, MessageSquare, CheckSquare, Trash2,
  Plus, Check, Edit3, Calendar, Loader2, Copy, Move, Palette, ArrowRight
} from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { useBoardContext } from "../../context/BoardContext";
import * as cardsApi from "../../utils/cardsApi";
import { fetchListsByBoard } from "../../utils/listsApi";
import TypingBadge from "../ui/TypingBadge";

const PRIORITY_OPTIONS = [
  { value: "none",     label: "None",     color: "#6b7280" },
  { value: "low",      label: "Low",      color: "#34d399" },
  { value: "medium",   label: "Medium",   color: "#fbbf24" },
  { value: "high",     label: "High",     color: "#f97316" },
  { value: "critical", label: "Critical", color: "#ef4444" },
];

const COVER_COLORS = [
  "#7c3aed","#3b82f6","#10b981","#f59e0b","#ef4444",
  "#ec4899","#06b6d4","#8b5cf6","#14b8a6","#f97316", null,
];

const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "";
const isOverdue = (d) => d && new Date(d) < new Date();

const SectionHeader = ({ icon: Icon, title, action }) => (
  <div className="flex items-center justify-between mb-2">
    <div className="flex items-center gap-2">
      <Icon size={14} className="text-violet-400" />
      <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</span>
    </div>
    {action}
  </div>
);

/** Tiny pulsing dot shown in modal header while any field is saving */
const SavingIndicator = ({ visible }) => {
  if (!visible) return null;
  return (
    <span title="Saving…" style={{
      display: "inline-flex", alignItems: "center", gap: "4px",
      fontSize: "11px", color: "#a78bfa",
    }}>
      <span style={{
        width: "6px", height: "6px", borderRadius: "50%",
        background: "#7c3aed", animation: "pulse 1.2s ease-in-out infinite",
        display: "inline-block",
      }} />
      Saving…
    </span>
  );
};

const CardDetailModal = ({ cardId, onClose, onCardUpdated, boardId }) => {
  const { isDark } = useTheme();
  const { user }   = useAuth();
  const {
    optimisticUpdateCard, optimisticArchiveCard, pendingCardIds,
    emitTyping, emitStopTyping, getTypistsFor,
    registerCommentListener,
  } = useBoardContext();

  const [card, setCard]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingFields, setSavingFields] = useState(new Set());

  const [editTitle, setEditTitle] = useState(false);
  const [titleVal,  setTitleVal]  = useState("");
  const [editDesc,  setEditDesc]  = useState(false);
  const [descVal,   setDescVal]   = useState("");

  const [commentText,    setCommentText]    = useState("");
  const [addingComment,  setAddingComment]  = useState(false);
  const [editingComment, setEditingComment] = useState(null);
  // Inline confirmation states (replacing window.confirm)
  const [confirmArchive,      setConfirmArchive]      = useState(false);
  const [confirmDeleteComment, setConfirmDeleteComment] = useState(null); // commentId

  const [newCLTitle,  setNewCLTitle]  = useState("");
  const [addingCL,    setAddingCL]    = useState(false);
  const [newItemText, setNewItemText] = useState({});

  const [showMove,  setShowMove]  = useState(false);
  const [allLists,  setAllLists]  = useState([]);
  const [movingTo,  setMovingTo]  = useState(null);
  const [showCover, setShowCover] = useState(false);

  const overlayRef  = useRef(null);
  const titleDebRef = useRef(null);
  const descDebRef  = useRef(null);

  const isSaving = savingFields.size > 0 || pendingCardIds.has(cardId);

  const addSaving   = (f) => setSavingFields(p => new Set([...p, f]));
  const dropSaving  = (f) => setSavingFields(p => { const n = new Set(p); n.delete(f); return n; });

  /* ── Load card ── */
  useEffect(() => {
    if (!cardId) return;
    (async () => {
      setLoading(true);
      try {
        const c = await cardsApi.fetchCard(cardId);
        setCard(c); setTitleVal(c.title); setDescVal(c.description || "");
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [cardId]);

  const refresh = useCallback(async () => {
    const c = await cardsApi.fetchCard(cardId);
    setCard(c); onCardUpdated?.(c);
  }, [cardId, onCardUpdated]);

  // ── Subscribe to real-time comment events for THIS card ───────────────
  useEffect(() => {
    if (!registerCommentListener) return;
    const unsub = registerCommentListener(({ event, cardId: eid, comment, commentId, originSocketId }) => {
      if (eid !== cardId) return; // not our card
      setCard(prev => {
        if (!prev) return prev;
        if (event === "added") {
          // Deduplicate
          const exists = prev.comments.some(c => c._id === comment._id);
          if (exists) return prev;
          return { ...prev, comments: [...prev.comments, comment] };
        }
        if (event === "edited") {
          return {
            ...prev,
            comments: prev.comments.map(c =>
              c._id === comment._id ? { ...c, ...comment } : c
            ),
          };
        }
        if (event === "deleted") {
          return {
            ...prev,
            comments: prev.comments.filter(c => c._id !== commentId),
          };
        }
        return prev;
      });
    });
    return unsub;
  }, [cardId, registerCommentListener]);

  const handleOverlay = (e) => { if (e.target === overlayRef.current) onClose(); };

  /* ── Optimistic field update helper ── */
  const optimisticField = useCallback((field, value, apiFn) => {
    // Update local card state immediately
    setCard(prev => prev ? { ...prev, [field]: value } : prev);
    // Also propagate to board lists
    optimisticUpdateCard(cardId, { [field]: value });
    // Fire server call
    addSaving(field);
    apiFn().then(updated => {
      setCard(updated);
    }).catch(() => {
      // On error, revert local card
      refresh();
    }).finally(() => dropSaving(field));
  }, [cardId, optimisticUpdateCard, refresh]);

  /* ── Title (debounced, 400ms) ── */
  const handleTitleChange = (val) => {
    setTitleVal(val);
    emitTyping("card_title", null, cardId);
    clearTimeout(titleDebRef.current);
    titleDebRef.current = setTimeout(() => {
      if (!val.trim() || val === card?.title) return;
      optimisticField("title", val.trim(), () => cardsApi.updateCard(cardId, { title: val.trim() }));
    }, 400);
  };

  const saveTitle = () => {
    clearTimeout(titleDebRef.current);
    setEditTitle(false);
    emitStopTyping("card_title", null, cardId);
    if (!titleVal.trim() || titleVal === card?.title) return;
    optimisticField("title", titleVal.trim(), () => cardsApi.updateCard(cardId, { title: titleVal.trim() }));
  };

  /* ── Description (debounced, 400ms) ── */
  const handleDescChange = (val) => {
    setDescVal(val);
    emitTyping("card_desc", null, cardId);
    clearTimeout(descDebRef.current);
    descDebRef.current = setTimeout(() => {
      optimisticField("description", val, () => cardsApi.updateCard(cardId, { description: val }));
    }, 400);
  };

  const saveDesc = () => {
    clearTimeout(descDebRef.current);
    setEditDesc(false);
    emitStopTyping("card_desc", null, cardId);
    optimisticField("description", descVal, () => cardsApi.updateCard(cardId, { description: descVal }));
  };

  /* ── Priority / Due / Cover (instant optimistic) ── */
  const changePriority = (p) =>
    optimisticField("priority", p, () => cardsApi.updateCard(cardId, { priority: p }));

  const changeDueDate = (v) =>
    optimisticField("dueDate", v || null, () => cardsApi.updateCard(cardId, { dueDate: v || null }));

  const changeCover = (c) => {
    setShowCover(false);
    optimisticField("coverColor", c, () => cardsApi.updateCard(cardId, { coverColor: c }));
  };

  /* ── Comments ── */
  const submitComment = async () => {
    if (!commentText.trim()) return;
    setAddingComment(true);
    // Stop typing indicator immediately on post
    emitStopTyping("comment_typing", null, cardId);
    try {
      const newComment = await cardsApi.addComment(cardId, commentText);
      setCommentText("");
      // Optimistically append (socket event will handle other clients)
      setCard(prev => prev ? { ...prev, comments: [...(prev.comments || []), newComment] } : prev);
    } finally { setAddingComment(false); }
  };
  const saveEditComment = async (id, text) => {
    const updated = await cardsApi.editComment(cardId, id, text);
    setEditingComment(null);
    // Optimistic update locally (socket handles others)
    setCard(prev => prev ? {
      ...prev,
      comments: prev.comments.map(c => c._id === id ? { ...c, ...updated } : c),
    } : prev);
  };
  const delComment = async (id) => {
    await cardsApi.deleteComment(cardId, id);
    setConfirmDeleteComment(null);
    // Optimistic removal locally
    setCard(prev => prev ? {
      ...prev,
      comments: prev.comments.filter(c => c._id !== id),
    } : prev);
  };

  /* ── Checklists (optimistic toggle) ── */
  const addChecklist = async () => {
    if (!newCLTitle.trim()) return;
    await cardsApi.addChecklist(cardId, newCLTitle);
    setNewCLTitle(""); setAddingCL(false); await refresh();
  };
  const delChecklist = async (clId) => { await cardsApi.deleteChecklist(cardId, clId); await refresh(); };
  const addCLItem = async (clId) => {
    const text = newItemText[clId]?.trim(); if (!text) return;
    await cardsApi.addChecklistItem(cardId, clId, text);
    setNewItemText(p => ({ ...p, [clId]: "" })); await refresh();
  };

  /** Optimistic checklist toggle — immediate UI flip, rollback on error */
  const toggleItem = (clId, itemId, completed) => {
    setCard(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        checklists: prev.checklists.map(cl =>
          cl._id !== clId ? cl : {
            ...cl,
            items: cl.items.map(it =>
              it._id !== itemId ? it : { ...it, completed: !it.completed }
            ),
          }
        ),
      };
    });
    cardsApi.updateChecklistItem(cardId, clId, itemId, { completed: !completed })
      .then(refresh)
      .catch(() => { refresh(); });
  };

  const delItem = async (clId, itemId) => {
    await cardsApi.deleteChecklistItem(cardId, clId, itemId); await refresh();
  };

  /* ── Archive ── */
  const archive = () => {
    optimisticArchiveCard(cardId, () => cardsApi.archiveCard(cardId));
    onCardUpdated?.({ ...card, isArchived: true });
    onClose();
  };

  /* ── Duplicate ── */
  const duplicate = async () => {
    const newCard = await cardsApi.duplicateCard(cardId);
    onCardUpdated?.(newCard, "duplicate"); onClose();
  };

  /* ── Move Card ── */
  const openMove = async () => {
    setShowMove(true);
    if (allLists.length === 0 && boardId) {
      try { const lists = await fetchListsByBoard(boardId); setAllLists(lists); }
      catch (e) { console.error(e); }
    }
  };
  const doMove = async (targetListId) => {
    if (targetListId === card.list || targetListId === card.list?._id) { setShowMove(false); return; }
    setMovingTo(targetListId);
    try {
      await cardsApi.moveCard(cardId, { targetListId, newPosition: 0 });
      onCardUpdated?.({ ...card, list: targetListId, isArchived: false }, "move");
      onClose();
    } catch (e) { console.error(e); }
    finally { setMovingTo(null); }
  };

  /* ── Styles ── */
  const bg      = isDark ? "rgba(10,15,35,0.97)" : "#fff";
  const surface = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)";
  const border  = isDark ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.09)";
  const txt     = isDark ? "rgba(255,255,255,0.90)" : "#111827";
  const sub     = isDark ? "rgba(255,255,255,0.40)" : "#6b7280";
  const iCls    = "w-full rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-violet-500/50 transition-all";
  const iStyle  = { background: surface, border: `1px solid ${border}`, color: txt };

  if (!cardId) return null;

  return (
    <div ref={overlayRef} onClick={handleOverlay}
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto py-8 px-4"
      style={{ background: "rgba(0,0,0,0.60)", backdropFilter: "blur(4px)" }}>
      <div className="relative w-full max-w-2xl rounded-2xl shadow-2xl animate-scale-in"
        style={{ background: bg, border: `1px solid ${border}` }}>

        {card?.coverColor && (
          <div className="h-10 w-full rounded-t-2xl" style={{ background: card.coverColor }} />
        )}

        {/* Header */}
        <div className="flex items-start gap-3 p-5 pb-3">
          {editTitle ? (
            <input autoFocus value={titleVal}
              onChange={e => handleTitleChange(e.target.value)}
              onBlur={saveTitle}
              onKeyDown={e => { if (e.key === "Enter") saveTitle(); if (e.key === "Escape") { setEditTitle(false); emitStopTyping("card_title", null, cardId); } }}
              className={`${iCls} flex-1 text-base font-semibold`} style={iStyle} />
          ) : (
            <h2 onClick={() => { if (!loading) setEditTitle(true); }}
              className="flex-1 text-base font-semibold cursor-pointer hover:text-violet-500 transition-colors"
              style={{ color: txt }}>
              {loading ? "Loading…" : card?.title}
            </h2>
          )}
          <div className="flex items-center gap-2 flex-shrink-0">
            <SavingIndicator visible={isSaving} />
            {card && (<>
              <button onClick={openMove} title="Move card" className="p-1.5 rounded-lg transition-colors hover:bg-white/10" style={{ color: sub }}><Move size={14} /></button>
              <button onClick={() => setShowCover(v => !v)} title="Cover color" className="p-1.5 rounded-lg transition-colors hover:bg-white/10" style={{ color: sub }}><Palette size={14} /></button>
              <button onClick={duplicate} title="Duplicate" className="p-1.5 rounded-lg transition-colors hover:bg-white/10" style={{ color: sub }}><Copy size={14} /></button>
              <button onClick={() => setConfirmArchive(v => !v)} title="Archive" className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"><Trash2 size={14} /></button>
            </>)}
            <button onClick={onClose} className="p-1.5 rounded-lg transition-colors hover:bg-white/10" style={{ color: sub }}><X size={16} /></button>
          </div>
        </div>

        {/* Remote typing indicator strip — title + desc */}
        {(() => {
          const remoteTypists = [
            ...getTypistsFor("card_title", null, cardId),
            ...getTypistsFor("card_desc",  null, cardId),
          ].filter((t, i, arr) => arr.findIndex(x => x.userId === t.userId) === i);
          return remoteTypists.length > 0 ? (
            <div className="px-5 pb-1">
              <TypingBadge typists={remoteTypists} />
            </div>
          ) : null;
        })()}

        {/* Inline archive confirm banner */}
        {confirmArchive && (
          <div className="mx-5 mb-2 px-4 py-3 rounded-xl flex items-center justify-between gap-3"
            style={{ background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.25)" }}>
            <span className="text-sm text-red-400 font-medium">Archive “{card?.title}”?</span>
            <div className="flex gap-2">
              <button onClick={archive}
                className="px-3 py-1 rounded-lg bg-red-500 hover:bg-red-400 text-white text-xs font-semibold transition-all">
                Archive
              </button>
              <button onClick={() => setConfirmArchive(false)}
                className="px-3 py-1 rounded-lg text-xs transition-all"
                style={{ background: "rgba(255,255,255,0.08)", color: "#9ca3af" }}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-violet-400" /></div>
        ) : (
          <div className="px-5 pb-5 space-y-5">

            {/* Cover picker */}
            {showCover && (
              <div className="rounded-xl p-3 animate-scale-in" style={{ background: surface, border: `1px solid ${border}` }}>
                <p className="text-xs font-semibold mb-2" style={{ color: sub }}>Cover Color</p>
                <div className="flex flex-wrap gap-2">
                  {COVER_COLORS.map((c, i) => (
                    <button key={i} onClick={() => changeCover(c)}
                      className="w-7 h-7 rounded-lg border-2 transition-all hover:scale-110"
                      style={{ background: c || (isDark ? "rgba(255,255,255,0.05)" : "#f3f4f6"), borderColor: card.coverColor === c ? "#7c3aed" : "transparent" }}
                      title={c || "No color"}>
                      {!c && <X size={12} className="mx-auto" style={{ color: sub }} />}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Move Card */}
            {showMove && (
              <div className="rounded-xl p-3 animate-scale-in" style={{ background: surface, border: `1px solid ${border}` }}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold" style={{ color: sub }}>Move to list</p>
                  <button onClick={() => setShowMove(false)} style={{ color: sub }}><X size={12} /></button>
                </div>
                <div className="space-y-1 max-h-36 overflow-y-auto">
                  {allLists.map(l => {
                    const isCurrent = l._id === (card.list?._id || card.list);
                    return (
                      <button key={l._id} disabled={isCurrent || movingTo === l._id}
                        onClick={() => doMove(l._id)}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all disabled:opacity-40"
                        style={{ background: isCurrent ? (isDark ? "rgba(124,58,237,0.15)" : "rgba(124,58,237,0.08)") : "transparent", color: isCurrent ? "#7c3aed" : txt }}>
                        <span className="truncate">{l.title}</span>
                        {isCurrent ? <Check size={12} /> : <ArrowRight size={12} style={{ color: sub }} />}
                      </button>
                    );
                  })}
                  {allLists.length === 0 && <p className="text-xs text-center py-2" style={{ color: sub }}>Loading lists…</p>}
                </div>
              </div>
            )}

            {/* Priority & Due Date */}
            <div className="flex flex-wrap gap-3">
              <div className="flex-1 min-w-[140px]">
                <SectionHeader icon={Flag} title="Priority" />
                <div className="flex flex-wrap gap-1.5">
                  {PRIORITY_OPTIONS.map(opt => (
                    <button key={opt.value} onClick={() => changePriority(opt.value)}
                      className="px-2.5 py-1 rounded-full text-xs font-semibold transition-all border"
                      style={{ background: card.priority === opt.value ? `${opt.color}25` : surface, border: `1px solid ${card.priority === opt.value ? opt.color : border}`, color: card.priority === opt.value ? opt.color : sub }}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex-1 min-w-[160px]">
                <SectionHeader icon={Calendar} title="Due Date" />
                <input type="date"
                  defaultValue={card.dueDate ? new Date(card.dueDate).toISOString().split("T")[0] : ""}
                  onChange={e => changeDueDate(e.target.value)}
                  className={iCls}
                  style={{ ...iStyle, color: isOverdue(card.dueDate) ? "#ef4444" : txt }} />
              </div>
            </div>

            {/* Description */}
            <div>
              <SectionHeader icon={Edit3} title="Description"
                action={!editDesc && <button onClick={() => setEditDesc(true)} className="text-xs text-violet-400 hover:text-violet-300">Edit</button>} />
              {editDesc ? (
                <div className="space-y-2">
                  <textarea autoFocus rows={4} value={descVal}
                    onChange={e => handleDescChange(e.target.value)}
                    className={`${iCls} resize-none`} style={iStyle} placeholder="Add a description…" />
                  <div className="flex gap-2">
                    <button onClick={saveDesc}
                      className="px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold transition-all">
                      Save
                    </button>
                    <button onClick={() => { setEditDesc(false); setDescVal(card.description || ""); }}
                      className="px-3 py-1.5 rounded-lg text-xs transition-all" style={{ background: surface, color: sub }}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div onClick={() => setEditDesc(true)}
                  className="rounded-xl px-3 py-2.5 cursor-pointer min-h-[60px] text-sm transition-all"
                  style={{ background: surface, border: `1px solid ${border}`, color: card.description ? txt : sub }}>
                  {card.description || "Click to add a description…"}
                </div>
              )}
            </div>

            {/* Checklists */}
            <div>
              <SectionHeader icon={CheckSquare} title="Checklists"
                action={<button onClick={() => setAddingCL(v => !v)} className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1"><Plus size={12} /> Add</button>} />
              {addingCL && (
                <div className="flex gap-2 mb-3">
                  <input autoFocus value={newCLTitle} onChange={e => setNewCLTitle(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") addChecklist(); if (e.key === "Escape") setAddingCL(false); }}
                    placeholder="Checklist name…" className={`${iCls} flex-1`} style={iStyle} />
                  <button onClick={addChecklist} className="px-3 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold transition-all">Add</button>
                </div>
              )}
              {card.checklists?.map(cl => {
                const done = cl.items.filter(i => i.completed).length;
                const total = cl.items.length;
                const pct = total ? Math.round((done / total) * 100) : 0;
                return (
                  <div key={cl._id} className="mb-4 rounded-xl p-3" style={{ background: surface, border: `1px solid ${border}` }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold" style={{ color: txt }}>{cl.title}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs" style={{ color: sub }}>{done}/{total}</span>
                        <button onClick={() => delChecklist(cl._id)} className="p-1 rounded text-red-400 hover:bg-red-500/10"><Trash2 size={12} /></button>
                      </div>
                    </div>
                    {total > 0 && (
                      <div className="h-1 rounded-full mb-3 overflow-hidden" style={{ background: border }}>
                        <div className="h-full rounded-full bg-violet-500 transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    )}
                    <div className="space-y-1.5">
                      {cl.items.map(item => (
                        <div key={item._id} className="flex items-center gap-2 group">
                          <button onClick={() => toggleItem(cl._id, item._id, item.completed)}
                            className="w-4 h-4 rounded flex-shrink-0 border transition-all flex items-center justify-center"
                            style={{ background: item.completed ? "#7c3aed" : "transparent", borderColor: item.completed ? "#7c3aed" : border }}>
                            {item.completed && <Check size={10} className="text-white" />}
                          </button>
                          <span className="flex-1 text-sm"
                            style={{ color: item.completed ? sub : txt, textDecoration: item.completed ? "line-through" : "none" }}>
                            {item.text}
                          </span>
                          <button onClick={() => delItem(cl._id, item._id)} className="opacity-0 group-hover:opacity-100 p-0.5 text-red-400"><X size={11} /></button>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2 mt-2">
                      <input value={newItemText[cl._id] || ""} onChange={e => setNewItemText(p => ({ ...p, [cl._id]: e.target.value }))}
                        onKeyDown={e => { if (e.key === "Enter") addCLItem(cl._id); }}
                        placeholder="Add item…" className={`${iCls} flex-1 text-xs py-1.5`} style={iStyle} />
                      <button onClick={() => addCLItem(cl._id)} className="px-2.5 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs"><Plus size={12} /></button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Comments */}
            <div>
              <SectionHeader icon={MessageSquare} title={`Comments (${card.comments?.length || 0})`} />
              <div className="flex gap-2 mb-3">
                <div className="w-7 h-7 rounded-full bg-violet-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {user?.name?.[0]?.toUpperCase() || "U"}
                </div>
                <div className="flex-1 space-y-2">
                  {/* Comment typing indicator — shown when remote users type here */}
                  {getTypistsFor("comment_typing", null, cardId).length > 0 && (
                    <TypingBadge typists={getTypistsFor("comment_typing", null, cardId)} />
                  )}
                  <textarea value={commentText}
                    onChange={e => {
                      setCommentText(e.target.value);
                      emitTyping("comment_typing", null, cardId);
                    }}
                    onBlur={() => emitStopTyping("comment_typing", null, cardId)}
                    onKeyDown={e => {
                      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) submitComment();
                    }}
                    placeholder="Write a comment… (Ctrl+Enter to post)" rows={2}
                    className={`${iCls} resize-none`} style={iStyle} />
                  {commentText.trim() && (
                    <button onClick={submitComment} disabled={addingComment}
                      className="px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold disabled:opacity-50">
                      {addingComment ? "Posting…" : "Post"}
                    </button>
                  )}
                </div>
              </div>
              <div className="space-y-3">
                {[...(card.comments || [])].reverse().map(c => (
                  <div key={c._id} className="flex gap-2">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                      style={{ background: `linear-gradient(135deg, ${c.author?.avatarColor || "#7c3aed"}, #4f46e5)` }}>
                      {c.author?.name?.[0]?.toUpperCase() || "?"}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-semibold" style={{ color: txt }}>{c.author?.name || "User"}</span>
                        <span className="text-[10px]" style={{ color: sub }}>{fmtDate(c.createdAt)}</span>
                        {c.isEdited && <span className="text-[10px] italic" style={{ color: sub }}>(edited)</span>}
                      </div>
                      {editingComment?.id === c._id ? (
                        <div className="space-y-1.5">
                          <textarea autoFocus rows={2} value={editingComment.text}
                            onChange={e => setEditingComment(p => ({ ...p, text: e.target.value }))}
                            className={`${iCls} resize-none text-xs`} style={iStyle} />
                          <div className="flex gap-2">
                            <button onClick={() => saveEditComment(c._id, editingComment.text)} className="px-2.5 py-1 rounded-lg bg-violet-600 text-white text-xs">Save</button>
                            <button onClick={() => setEditingComment(null)} className="px-2.5 py-1 rounded-lg text-xs" style={{ background: surface, color: sub }}>Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm leading-relaxed" style={{ color: txt }}>{c.text}</p>
                      )}
                      {c.author?._id === user?._id && !editingComment && (
                        <div className="flex gap-2 mt-1">
                          <button onClick={() => setEditingComment({ id: c._id, text: c.text })} className="text-[11px]" style={{ color: sub }}>Edit</button>
                          <button onClick={() => setConfirmDeleteComment(c._id)} className="text-[11px] text-red-400">Delete</button>
                        </div>
                      )}
                      {/* Inline delete confirm */}
                      {confirmDeleteComment === c._id && (
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[11px]" style={{ color: sub }}>Delete this comment?</span>
                          <button onClick={() => delComment(c._id)}
                            className="text-[11px] text-red-400 font-semibold hover:underline">Yes</button>
                          <button onClick={() => setConfirmDeleteComment(null)}
                            className="text-[11px]" style={{ color: sub }}>Cancel</button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
};

export default CardDetailModal;
