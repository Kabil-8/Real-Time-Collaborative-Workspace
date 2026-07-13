import React, { useState } from "react";
import { Droppable } from "@hello-pangea/dnd";
import CardItem from "./CardItem";
import { useBoard } from "../../context/BoardContext";

export default function ListColumn({ list, cards, onOpenCard, listDragHandleProps }) {
  const { createCard, updateList, deleteList } = useBoard();
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(list.title);

  async function handleAdd(e) {
    e.preventDefault();
    if (!title.trim()) return;
    await createCard(list._id, title.trim());
    setTitle("");
    setAdding(false);
  }

  async function handleTitleSave() {
    if (titleDraft.trim() && titleDraft !== list.title) {
      await updateList(list._id, { title: titleDraft.trim() });
    }
    setEditingTitle(false);
  }

  async function handleDelete() {
    if (window.confirm(`Delete list "${list.title}" and all its cards?`)) {
      await deleteList(list._id);
    }
  }

  return (
    <div className="flex w-72 shrink-0 flex-col rounded-lg bg-slate-100 p-3">
      <div
        className="mb-2 flex items-center justify-between gap-2"
        {...listDragHandleProps}
      >
        {editingTitle ? (
          <input
            autoFocus
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={handleTitleSave}
            onKeyDown={(e) => e.key === "Enter" && handleTitleSave()}
            className="flex-1 rounded border border-brand-400 bg-white px-2 py-1 text-sm font-semibold"
          />
        ) : (
          <h3
            onClick={() => { setTitleDraft(list.title); setEditingTitle(true); }}
            className="flex-1 cursor-pointer px-1 text-sm font-semibold text-slate-800"
          >
            {list.title}
          </h3>
        )}
        <button onClick={handleDelete} className="text-slate-400 hover:text-red-500 text-lg leading-none px-1" title="Delete list">×</button>
      </div>
      <Droppable droppableId={list._id} type="CARD">
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex flex-1 min-h-[20px] flex-col gap-2 rounded ${snapshot.isDraggingOver ? "bg-brand-50" : ""}`}
          >
            {cards.map((c, i) => (
              <CardItem key={c._id} card={c} index={i} onOpen={onOpenCard} />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
      {adding ? (
        <form onSubmit={handleAdd} className="mt-2">
          <textarea
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAdd(e); } }}
            placeholder="Card title"
            className="w-full resize-none rounded border border-slate-300 p-2 text-sm"
            rows={2}
          />
          <div className="mt-2 flex gap-2">
            <button type="submit" className="rounded bg-brand-600 px-3 py-1 text-xs font-medium text-white hover:bg-brand-700">Add</button>
            <button type="button" onClick={() => { setAdding(false); setTitle(""); }} className="rounded px-2 py-1 text-xs text-slate-600 hover:bg-slate-200">Cancel</button>
          </div>
        </form>
      ) : (
        <button onClick={() => setAdding(true)} className="mt-2 rounded px-2 py-1 text-left text-sm text-slate-500 hover:bg-slate-200">
          + Add a card
        </button>
      )}
    </div>
  );
}
