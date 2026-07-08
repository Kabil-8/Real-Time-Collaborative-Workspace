import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { DragDropContext, Droppable } from "@hello-pangea/dnd";
import api from "../utils/api";
import CardItem from "../components/board/CardItem";

const BoardPage = () => {
  const { boardId } = useParams();
  const [board, setBoard] = useState(null);
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newCardTitle, setNewCardTitle] = useState("");
  const [activeListId, setActiveListId] = useState("");

  useEffect(() => {
    const loadBoard = async () => {
      try {
        const { data } = await api.get(`/boards/${boardId}`);
        setBoard(data.board);
        setLists(data.lists || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadBoard();
  }, [boardId]);

  const handleDragEnd = async (result) => {
    if (!result.destination) return;
    const { source, destination, draggableId } = result;
    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return;
    }

    const newLists = [...lists];
    const sourceList = newLists.find((list) => list._id === source.droppableId);
    const destinationList = newLists.find((list) => list._id === destination.droppableId);
    const [movedCard] = sourceList.cards.splice(source.index, 1);
    destinationList.cards.splice(destination.index, 0, movedCard);
    setLists(newLists);

    try {
      await api.patch(`/boards/${boardId}`, {
        listOrder: newLists.map((list) => list._id),
        lists: newLists.map((list) => ({
          _id: list._id,
          cardOrder: list.cards.map((card) => card._id),
        })),
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateCard = async (listId) => {
    if (!newCardTitle.trim()) return;
    try {
      const { data } = await api.post("/cards", {
        title: newCardTitle.trim(),
        listId,
        boardId,
      });
      setLists((prev) =>
        prev.map((list) =>
          list._id === listId
            ? { ...list, cards: [...(list.cards || []), data.card] }
            : list
        )
      );
      setNewCardTitle("");
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-400">
        Loading board…
      </div>
    );
  }

  if (!board) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-400">
        Board not found.
      </div>
    );
  }

  return (
    <div className="px-8 py-8 max-w-full">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">{board.title}</h1>
          <p className="text-slate-500 mt-1">{board.description}</p>
        </div>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid gap-4 xl:grid-cols-3">
          {lists.map((list) => (
            <div key={list._id} className="rounded-3xl bg-slate-900 border border-slate-800 p-4 shadow-lg shadow-black/20">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-white">{list.title}</h2>
                  <p className="text-xs text-slate-500">{(list.cards || []).length} cards</p>
                </div>
              </div>

              <Droppable droppableId={list._id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`min-h-[120px] rounded-3xl p-2 transition-colors ${snapshot.isDraggingOver ? "bg-slate-800" : "bg-slate-950/80"}`}
                  >
                    {(list.cards || []).map((card, index) => (
                      <CardItem key={card._id} card={card} index={index} />
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>

              <div className="mt-4 space-y-2">
                <input
                  value={activeListId === list._id ? newCardTitle : ""}
                  onChange={(event) => {
                    setActiveListId(list._id);
                    setNewCardTitle(event.target.value);
                  }}
                  placeholder="New card title"
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-violet-500"
                />
                <button
                  onClick={() => handleCreateCard(list._id)}
                  className="w-full rounded-2xl bg-violet-600 px-3 py-2 text-sm font-semibold text-white hover:bg-violet-500 transition-colors"
                >
                  Add card
                </button>
              </div>
            </div>
          ))}
        </div>
      </DragDropContext>
    </div>
  );
};

export default BoardPage;
