import React, { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { DragDropContext } from "@hello-pangea/dnd";
import { BoardProvider, useBoard } from "../context/BoardContext";
import ListColumn from "../components/board/ListColumn";
import CardDetailModal from "../components/board/CardDetailModal";

function BoardInner() {
  const { board, lists, cards, loading, error, createList, moveCard } = useBoard();
  const [openCard, setOpenCard] = useState(null);
  const [addingList, setAddingList] = useState(false);
  const [newListTitle, setNewListTitle] = useState("");

  if (loading) return <div className="p-6 text-slate-500">Loading board…</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;
  if (!board) return null;

  const cardsByList = {};
  for (const l of lists) cardsByList[l._id] = [];
  for (const c of cards) {
    if (cardsByList[c.listId]) cardsByList[c.listId].push(c);
  }
  for (const id in cardsByList) cardsByList[id].sort((a, b) => a.order - b.order);
  const sortedLists = [...lists].sort((a, b) => a.order - b.order);

  function onDragEnd(result) {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;
    moveCard(draggableId, destination.droppableId, destination.index);
  }

  async function handleAddList(e) {
    e.preventDefault();
    if (!newListTitle.trim()) return;
    await createList(newListTitle.trim());
    setNewListTitle("");
    setAddingList(false);
  }

  // find latest openCard from state so edits reflect immediately
  const currentOpenCard = openCard ? cards.find((c) => c._id === openCard._id) || openCard : null;

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex items-center gap-3">
        <Link to="/" className="text-sm text-slate-500 hover:text-slate-800">← Boards</Link>
        <h1 className="text-xl font-semibold">{board.name}</h1>
      </div>
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex flex-1 items-start gap-4 overflow-x-auto pb-4">
          {sortedLists.map((list) => (
            <ListColumn
              key={list._id}
              list={list}
              cards={cardsByList[list._id] || []}
              onOpenCard={setOpenCard}
            />
          ))}
          <div className="w-72 shrink-0">
            {addingList ? (
              <form onSubmit={handleAddList} className="rounded-lg bg-slate-100 p-3">
                <input
                  autoFocus
                  value={newListTitle}
                  onChange={(e) => setNewListTitle(e.target.value)}
                  placeholder="List title"
                  className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                />
                <div className="mt-2 flex gap-2">
                  <button type="submit" className="rounded bg-brand-600 px-3 py-1 text-xs font-medium text-white hover:bg-brand-700">Add list</button>
                  <button type="button" onClick={() => { setAddingList(false); setNewListTitle(""); }} className="rounded px-2 py-1 text-xs text-slate-600 hover:bg-slate-200">Cancel</button>
                </div>
              </form>
            ) : (
              <button
                onClick={() => setAddingList(true)}
                className="w-full rounded-lg border-2 border-dashed border-slate-300 bg-white/50 p-3 text-sm text-slate-600 hover:bg-white hover:border-slate-400"
              >
                + Add another list
              </button>
            )}
          </div>
        </div>
      </DragDropContext>
      {currentOpenCard && (
        <CardDetailModal card={currentOpenCard} onClose={() => setOpenCard(null)} />
      )}
    </div>
  );
}

export default function BoardPage() {
  const { boardId } = useParams();
  return (
    <BoardProvider boardId={boardId}>
      <BoardInner />
    </BoardProvider>
  );
}