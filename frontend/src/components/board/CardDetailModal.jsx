import React, { useState, useEffect, useRef } from "react";
import {
  X, Flag, Clock, MessageSquare, CheckSquare, Trash2,
  Plus, Check, Edit3, User, Tag, Calendar, Loader2, Copy
} from "lucide-react";
import api from "../../utils/api";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";

const PRIORITY_OPTIONS = [
  { value: "none",     label: "None",     color: "#6b7280" },
  { value: "low",      label: "Low",      color: "#34d399" },
  { value: "medium",   label: "Medium",   color: "#fbbf24" },
  { value: "high",     label: "High",     color: "#f97316" },
  { value: "critical", label: "Critical", color: "#ef4444" },
];

const formatDate = (d) => d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "";
const isOverdue  = (d) => d && new Date(d) < new Date();

/* ── Section header helper ── */
const SectionHeader = ({ icon: Icon, title, action }) => (
  <div className="flex items-center justify-between mb-2">
    <div className="flex items-center gap-2">
      <Icon size={14} className="text-violet-400" />
      <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</span>
    </div>
    {action}
  </div>
);

/* ══════════════════════════════════════════════════════════════
   CardDetailModal
══════════════════════════════════════════════════════════════ */
const CardDetailModal = ({ cardId, onClose, onCardUpdated }) => {
  const { isDark } = useTheme();
  const { user }   = useAuth();

  const [card,       setCard]       = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState(false);

  /* edit states */
  const [editTitle, setEditTitle]   = useState(false);
  const [titleVal,  setTitleVal]    = useState("");
  const [editDesc,  setEditDesc]    = useState(false);
  const [descVal,   setDescVal]     = useState("");

  /* comment states */
  const [commentText, setCommentText]     = useState("");
  const [addingComment, setAddingComment] = useState(false);
  const [editingComment, setEditingComment] = useState(null); // { id, text }

  /* checklist add */
  const [newCLTitle,  setNewCLTitle]  = useState("");
  const [addingCL,    setAddingCL]    = useState(false);
  const [newItemText, setNewItemText] = useState({});

  const overlayRef = useRef(null);

  /* ── Load card ── */
  useEffect(() => {
    if (!cardId) return;
    (async () => {
      setLoading(true);
      try {
        const { data } = await api.get(`/cards/${cardId}`);
        setCard(data.card);
        setTitleVal(data.card.title);
        setDescVal(data.card.description || "");
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [cardId]);

  const refresh = async () => {
    const { data } = await api.get(`/cards/${cardId}`);
    setCard(data.card);
    onCardUpdated?.(data.card);
  };

  /* ── Close on overlay click ── */
  const handleOverlay = (e) => { if (e.target === overlayRef.current) onClose(); };

  /* ── Title save ── */
  const saveTitle = async () => {
    if (!titleVal.trim() || titleVal === card.title) { setEditTitle(false); return; }
    setSaving(true);
    try {
      await api.patch(`/cards/${cardId}`, { title: titleVal.trim() });
      await refresh();
    } finally { setSaving(false); setEditTitle(false); }
  };

  /* ── Desc save ── */
  const saveDesc = async () => {
    setSaving(true);
    try {
      await api.patch(`/cards/${cardId}`, { description: descVal });
      await refresh();
    } finally { setSaving(false); setEditDesc(false); }
  };

  /* ── Priority ── */
  const changePriority = async (p) => {
    await api.patch(`/cards/${cardId}`, { priority: p });
    await refresh();
  };

  /* ── Due date ── */
  const changeDueDate = async (val) => {
    await api.patch(`/cards/${cardId}`, { dueDate: val || null });
    await refresh();
  };

  /* ── Comments ── */
  const submitComment = async () => {
    if (!commentText.trim()) return;
    setAddingComment(true);
    try {
      await api.post(`/cards/${cardId}/comments`, { text: commentText });
      setCommentText("");
      await refresh();
    } finally { setAddingComment(false); }
  };

  const saveEditComment = async (id, text) => {
    await api.patch(`/cards/${cardId}/comments/${id}`, { text });
    setEditingComment(null);
    await refresh();
  };

  const delComment = async (id) => {
    if (!window.confirm("Delete this comment?")) return;
    await api.delete(`/cards/${cardId}/comments/${id}`);
    await refresh();
  };

  /* ── Checklists ── */
  const addChecklist = async () => {
    if (!newCLTitle.trim()) return;
    await api.post(`/cards/${cardId}/checklists`, { title: newCLTitle });
    setNewCLTitle(""); setAddingCL(false);
    await refresh();
  };

  const delChecklist = async (clId) => {
    await api.delete(`/cards/${cardId}/checklists/${clId}`);
    await refresh();
  };

  const addCLItem = async (clId) => {
    const text = newItemText[clId]?.trim();
    if (!text) return;
    await api.post(`/cards/${cardId}/checklists/${clId}/items`, { text });
    setNewItemText(p => ({ ...p, [clId]: "" }));
    await refresh();
  };

  const toggleItem = async (clId, itemId, completed) => {
    await api.patch(`/cards/${cardId}/checklists/${clId}/items/${itemId}`, { completed: !completed });
    await refresh();
  };

  const delItem = async (clId, itemId) => {
    await api.delete(`/cards/${cardId}/checklists/${clId}/items/${itemId}`);
    await refresh();
  };

  /* ── Archive / Duplicate ── */
  const archive = async () => {
    if (!window.confirm(`Archive "${card.title}"?`)) return;
    await api.delete(`/cards/${cardId}`);
    onCardUpdated?.({ ...card, isArchived: true });
    onClose();
  };

  const duplicate = async () => {
    const { data } = await api.post(`/cards/${cardId}/duplicate`);
    onCardUpdated?.(data.card, "duplicate");
    onClose();
  };

  /* ════════════════════ Styles ════════════════════ */
  const bg      = isDark ? "rgba(10,15,35,0.97)"    : "#fff";
  const surface = isDark ? "rgba(255,255,255,0.05)"  : "rgba(0,0,0,0.04)";
  const border  = isDark ? "rgba(255,255,255,0.09)"  : "rgba(0,0,0,0.09)";
  const txt     = isDark ? "rgba(255,255,255,0.90)"  : "#111827";
  const sub     = isDark ? "rgba(255,255,255,0.40)"  : "#6b7280";
  const inputCls = `w-full rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-violet-500/50 transition-all`;
  const inputStyle = { background: surface, border: `1px solid ${border}`, color: txt };

  if (!cardId) return null;

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlay}
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto py-8 px-4"
      style={{ background: "rgba(0,0,0,0.60)", backdropFilter: "blur(4px)" }}
    >
      <div
        className="relative w-full max-w-2xl rounded-2xl shadow-2xl animate-scale-in"
        style={{ background: bg, border: `1px solid ${border}` }}
      >
        {/* Header */}
        <div className="flex items-start gap-3 p-5 pb-3">
          {editTitle ? (
            <input
              autoFocus
              value={titleVal}
              onChange={e => setTitleVal(e.target.value)}
              onBlur={saveTitle}
              onKeyDown={e => { if (e.key === "Enter") saveTitle(); if (e.key === "Escape") setEditTitle(false); }}
              className={`${inputCls} flex-1 text-base font-semibold`}
              style={inputStyle}
            />
          ) : (
            <h2
              onClick={() => { if (!loading) setEditTitle(true); }}
              className="flex-1 text-base font-semibold cursor-pointer hover:text-violet-500 transition-colors"
              style={{ color: txt }}
            >
              {loading ? "Loading…" : card?.title}
            </h2>
          )}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {card && (
              <>
                <button onClick={duplicate} title="Duplicate" className="p-1.5 rounded-lg transition-colors" style={{ color: sub }}>
                  <Copy size={14} />
                </button>
                <button onClick={archive} title="Archive" className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors">
                  <Trash2 size={14} />
                </button>
              </>
            )}
            <button onClick={onClose} className="p-1.5 rounded-lg transition-colors" style={{ color: sub }}>
              <X size={16} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 size={28} className="animate-spin text-violet-400" />
          </div>
        ) : (
          <div className="px-5 pb-5 space-y-5">

            {/* ── Priority & Due date row ── */}
            <div className="flex flex-wrap gap-3">
              {/* Priority */}
              <div className="flex-1 min-w-[140px]">
                <SectionHeader icon={Flag} title="Priority" />
                <div className="flex flex-wrap gap-1.5">
                  {PRIORITY_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => changePriority(opt.value)}
                      className="px-2.5 py-1 rounded-full text-xs font-semibold transition-all border"
                      style={{
                        background: card.priority === opt.value ? `${opt.color}25` : surface,
                        border: `1px solid ${card.priority === opt.value ? opt.color : border}`,
                        color: card.priority === opt.value ? opt.color : sub,
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Due date */}
              <div className="flex-1 min-w-[160px]">
                <SectionHeader icon={Calendar} title="Due Date" />
                <input
                  type="date"
                  defaultValue={card.dueDate ? new Date(card.dueDate).toISOString().split("T")[0] : ""}
                  onChange={e => changeDueDate(e.target.value)}
                  className={`${inputCls}`}
                  style={{
                    ...inputStyle,
                    color: isOverdue(card.dueDate) ? "#ef4444" : txt,
                  }}
                />
              </div>
            </div>

            {/* ── Description ── */}
            <div>
              <SectionHeader icon={Edit3} title="Description"
                action={!editDesc && (
                  <button onClick={() => setEditDesc(true)} className="text-xs text-violet-400 hover:text-violet-300">Edit</button>
                )}
              />
              {editDesc ? (
                <div className="space-y-2">
                  <textarea
                    autoFocus
                    rows={4}
                    value={descVal}
                    onChange={e => setDescVal(e.target.value)}
                    className={`${inputCls} resize-none`}
                    style={inputStyle}
                    placeholder="Add a description…"
                  />
                  <div className="flex gap-2">
                    <button onClick={saveDesc} disabled={saving} className="px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold disabled:opacity-50 transition-all">
                      {saving ? "Saving…" : "Save"}
                    </button>
                    <button onClick={() => { setEditDesc(false); setDescVal(card.description || ""); }} className="px-3 py-1.5 rounded-lg text-xs transition-all" style={{ background: surface, color: sub }}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => setEditDesc(true)}
                  className="rounded-xl px-3 py-2.5 cursor-pointer min-h-[60px] text-sm transition-all"
                  style={{ background: surface, border: `1px solid ${border}`, color: card.description ? txt : sub }}
                >
                  {card.description || "Click to add a description…"}
                </div>
              )}
            </div>

            {/* ── Checklists ── */}
            <div>
              <SectionHeader
                icon={CheckSquare}
                title="Checklists"
                action={
                  <button onClick={() => setAddingCL(v => !v)} className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1">
                    <Plus size={12} /> Add
                  </button>
                }
              />

              {addingCL && (
                <div className="flex gap-2 mb-3">
                  <input
                    autoFocus
                    value={newCLTitle}
                    onChange={e => setNewCLTitle(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") addChecklist(); if (e.key === "Escape") setAddingCL(false); }}
                    placeholder="Checklist name…"
                    className={`${inputCls} flex-1`}
                    style={inputStyle}
                  />
                  <button onClick={addChecklist} className="px-3 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold transition-all">Add</button>
                </div>
              )}

              {card.checklists?.map(cl => {
                const done  = cl.items.filter(i => i.completed).length;
                const total = cl.items.length;
                const pct   = total ? Math.round((done / total) * 100) : 0;
                return (
                  <div key={cl._id} className="mb-4 rounded-xl p-3" style={{ background: surface, border: `1px solid ${border}` }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold" style={{ color: txt }}>{cl.title}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs" style={{ color: sub }}>{done}/{total}</span>
                        <button onClick={() => delChecklist(cl._id)} className="p-1 rounded text-red-400 hover:bg-red-500/10 transition-colors"><Trash2 size={12} /></button>
                      </div>
                    </div>
                    {/* Progress bar */}
                    {total > 0 && (
                      <div className="h-1 rounded-full mb-3 overflow-hidden" style={{ background: border }}>
                        <div className="h-full rounded-full bg-violet-500 transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    )}
                    {/* Items */}
                    <div className="space-y-1.5">
                      {cl.items.map(item => (
                        <div key={item._id} className="flex items-center gap-2 group">
                          <button onClick={() => toggleItem(cl._id, item._id, item.completed)}
                            className="w-4 h-4 rounded flex-shrink-0 border transition-all flex items-center justify-center"
                            style={{ background: item.completed ? "#7c3aed" : "transparent", borderColor: item.completed ? "#7c3aed" : border }}>
                            {item.completed && <Check size={10} className="text-white" />}
                          </button>
                          <span className="flex-1 text-sm" style={{ color: item.completed ? sub : txt, textDecoration: item.completed ? "line-through" : "none" }}>
                            {item.text}
                          </span>
                          <button onClick={() => delItem(cl._id, item._id)} className="opacity-0 group-hover:opacity-100 p-0.5 text-red-400 transition-all"><X size={11} /></button>
                        </div>
                      ))}
                    </div>
                    {/* Add item */}
                    <div className="flex gap-2 mt-2">
                      <input
                        value={newItemText[cl._id] || ""}
                        onChange={e => setNewItemText(p => ({ ...p, [cl._id]: e.target.value }))}
                        onKeyDown={e => { if (e.key === "Enter") addCLItem(cl._id); }}
                        placeholder="Add item…"
                        className={`${inputCls} flex-1 text-xs py-1.5`}
                        style={inputStyle}
                      />
                      <button onClick={() => addCLItem(cl._id)} className="px-2.5 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs transition-all">
                        <Plus size={12} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── Comments ── */}
            <div>
              <SectionHeader icon={MessageSquare} title={`Comments (${card.comments?.length || 0})`} />

              {/* Add comment */}
              <div className="flex gap-2 mb-3">
                <div className="w-7 h-7 rounded-full bg-violet-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {user?.name?.[0]?.toUpperCase() || "U"}
                </div>
                <div className="flex-1 space-y-2">
                  <textarea
                    value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                    placeholder="Write a comment…"
                    rows={2}
                    className={`${inputCls} resize-none`}
                    style={inputStyle}
                  />
                  {commentText.trim() && (
                    <button
                      onClick={submitComment}
                      disabled={addingComment}
                      className="px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold disabled:opacity-50 transition-all"
                    >
                      {addingComment ? "Posting…" : "Post"}
                    </button>
                  )}
                </div>
              </div>

              {/* Comments list */}
              <div className="space-y-3">
                {[...(card.comments || [])].reverse().map(c => (
                  <div key={c._id} className="flex gap-2">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                      style={{ background: `linear-gradient(135deg, ${c.author?.avatarColor || "#7c3aed"}, #4f46e5)` }}
                    >
                      {c.author?.name?.[0]?.toUpperCase() || "?"}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-semibold" style={{ color: txt }}>{c.author?.name || "User"}</span>
                        <span className="text-[10px]" style={{ color: sub }}>{formatDate(c.createdAt)}</span>
                        {c.isEdited && <span className="text-[10px] italic" style={{ color: sub }}>(edited)</span>}
                      </div>

                      {editingComment?.id === c._id ? (
                        <div className="space-y-1.5">
                          <textarea
                            autoFocus
                            rows={2}
                            value={editingComment.text}
                            onChange={e => setEditingComment(p => ({ ...p, text: e.target.value }))}
                            className={`${inputCls} resize-none text-xs`}
                            style={inputStyle}
                          />
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
                          <button onClick={() => setEditingComment({ id: c._id, text: c.text })} className="text-[11px] transition-colors" style={{ color: sub }}>Edit</button>
                          <button onClick={() => delComment(c._id)} className="text-[11px] text-red-400 transition-colors">Delete</button>
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
