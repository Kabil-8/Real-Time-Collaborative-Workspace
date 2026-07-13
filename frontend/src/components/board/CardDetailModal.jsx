import React, { useEffect, useRef, useState } from "react";
import { useBoard } from "../../context/BoardContext";
import api from "../../utils/api";
import { getSocket } from "../../utils/socket";
import { useAuth } from "../../context/AuthContext";

export default function CardDetailModal({ card, onClose }) {
  const { updateCard, deleteCard } = useBoard();
  const { user } = useAuth();
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description || "");
  const [labels, setLabels] = useState((card.labels || []).join(", "));
  const [dueDate, setDueDate] = useState(card.dueDate ? card.dueDate.slice(0, 10) : "");
  const [saving, setSaving] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentBody, setCommentBody] = useState("");
  const [commentError, setCommentError] = useState(null);
  const [postingComment, setPostingComment] = useState(false);
  const [typingUserIds, setTypingUserIds] = useState([]);
  const typingTimer = useRef(null);

  useEffect(() => {
    setTitle(card.title);
    setDescription(card.description || "");
    setLabels((card.labels || []).join(", "));
    setDueDate(card.dueDate ? card.dueDate.slice(0, 10) : "");
  }, [card]);

  useEffect(() => {
    let active = true;
    setComments([]);
    setCommentError(null);
    api.get(`/boards/cards/${card._id}/comments`)
      .then((res) => {
        if (active) setComments(res.data.data.comments || []);
      })
      .catch((err) => {
        if (active) setCommentError(err.response?.data?.message || "Failed to load comments");
      });

    const socket = getSocket();
    const onCommentCreated = ({ comment }) => {
      if (String(comment.cardId) !== String(card._id)) return;
      setComments((prev) => (
        prev.some((item) => item._id === comment._id) ? prev : [...prev, comment]
      ));
    };
    const onCardTyping = ({ cardId, userId, isTyping }) => {
      if (String(cardId) !== String(card._id) || userId === user?.id) return;
      setTypingUserIds((previous) => (
        isTyping
          ? previous.includes(userId) ? previous : [...previous, userId]
          : previous.filter((id) => id !== userId)
      ));
    };
    socket.on("comment:created", onCommentCreated);
    socket.on("card:typing", onCardTyping);
    return () => {
      active = false;
      socket.off("comment:created", onCommentCreated);
      socket.off("card:typing", onCardTyping);
    };
  }, [card._id, user?.id]);

  useEffect(() => () => {
    if (typingTimer.current) clearTimeout(typingTimer.current);
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      await updateCard(card._id, {
        title: title.trim() || card.title,
        description,
        labels: labels.split(",").map((s) => s.trim()).filter(Boolean),
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      });
      onClose();
    } finally { setSaving(false); }
  }

  async function handleDelete() {
    if (window.confirm("Delete this card?")) {
      await deleteCard(card._id);
      onClose();
    }
  }

  async function handleAddComment(e) {
    e.preventDefault();
    const body = commentBody.trim();
    if (!body) return;
    setPostingComment(true);
    setCommentError(null);
    try {
      const res = await api.post(`/boards/cards/${card._id}/comments`, { body });
      const comment = res.data.data.comment;
      setComments((prev) => (
        prev.some((item) => item._id === comment._id) ? prev : [...prev, comment]
      ));
      setCommentBody("");
    } catch (err) {
      setCommentError(err.response?.data?.message || "Failed to post comment");
    } finally {
      setPostingComment(false);
    }
  }

  function handleCommentChange(value) {
    setCommentBody(value);
    const socket = getSocket();
    socket.emit("card:typing", { boardId: card.boardId, cardId: card._id, isTyping: Boolean(value.trim()) });
    if (typingTimer.current) clearTimeout(typingTimer.current);
    if (value.trim()) {
      typingTimer.current = setTimeout(() => {
        socket.emit("card:typing", { boardId: card.boardId, cardId: card._id, isTyping: false });
      }, 1500);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg animate-scale-in rounded-2xl border border-white/80 bg-white/95 p-6 shadow-float backdrop-blur" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between gap-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="flex-1 rounded-lg border border-transparent px-2 py-1 text-lg font-semibold hover:border-slate-300 focus:border-brand-400"
          />
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-xl leading-none">×</button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full rounded border border-slate-300 p-2 text-sm"
              placeholder="Add a more detailed description…"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Labels</label>
              <input
                value={labels}
                onChange={(e) => setLabels(e.target.value)}
                placeholder="bug, urgent"
                className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase text-slate-500">Comments</label>
            <div className="max-h-48 space-y-3 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/80 p-3">
              {comments.length === 0 ? (
                <p className="text-sm text-slate-500">No comments yet.</p>
              ) : comments.map((comment) => (
                <div key={comment._id} className="rounded-xl bg-white p-3 shadow-sm">
                  <div className="text-xs font-medium text-slate-700">
                    {comment.authorId?.name || "Workspace member"}
                    {comment.createdAt && <span className="ml-2 font-normal text-slate-400">{new Date(comment.createdAt).toLocaleString()}</span>}
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{comment.body}</p>
                </div>
              ))}
            </div>
            <form onSubmit={handleAddComment} className="mt-2 flex gap-2">
              <input
                value={commentBody}
                onChange={(e) => handleCommentChange(e.target.value)}
                maxLength={2000}
                placeholder="Write a comment"
                className="min-w-0 flex-1 rounded border border-slate-300 px-2 py-1.5 text-sm"
              />
              <button
                type="submit"
                disabled={postingComment || !commentBody.trim()}
                className="rounded bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
              >
                {postingComment ? "Posting…" : "Comment"}
              </button>
            </form>
            {typingUserIds.length > 0 && <p className="mt-2 text-xs text-slate-500">A teammate is typing…</p>}
            {commentError && <p className="mt-2 text-xs text-red-600">{commentError}</p>}
          </div>
        </div>
        <div className="mt-6 flex items-center justify-between">
          <button onClick={handleDelete} className="text-sm text-red-600 hover:underline">Delete card</button>
          <div className="flex gap-2">
            <button onClick={onClose} className="rounded px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="rounded bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50">
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
