import React, { useEffect, useState } from "react";
import { useBoard } from "../../context/BoardContext";

export default function CardDetailModal({ card, onClose }) {
  const { updateCard, deleteCard } = useBoard();
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description || "");
  const [labels, setLabels] = useState((card.labels || []).join(", "));
  const [dueDate, setDueDate] = useState(card.dueDate ? card.dueDate.slice(0, 10) : "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setTitle(card.title);
    setDescription(card.description || "");
    setLabels((card.labels || []).join(", "));
    setDueDate(card.dueDate ? card.dueDate.slice(0, 10) : "");
  }, [card]);

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between gap-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="flex-1 rounded border border-transparent px-2 py-1 text-lg font-semibold hover:border-slate-300 focus:border-brand-400"
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