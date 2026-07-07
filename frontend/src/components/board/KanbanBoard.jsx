import React, { useEffect, useState, useCallback } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import useBoardStore from "../../context/BoardContext";
import KanbanList from "./KanbanList";
import AddListForm from "./AddListForm";
import CardDetailModal from "./CardDetailModal";
import api from "../../utils/api";

// ─── Board canvas ─────────────────────────────────────────────────────────────

const KanbanBoard = ({ boardId, board, currentUser, typingUsers = [], emitTyping }) => {
  const {
    lists,
    fetchBoard,
    createList,
    updateList,
    deleteList,
    reorderLists,
    createCard,
    updateCard,
    deleteCard,
    moveCard,
  } = useBoardStore();

  const [selectedCard, setSelectedCard] = useState(null);
  const [selectedList, setSelectedList] = useState(null);

  // ─── DnD handler ──────────────────────────────────────────────────────────────
  const onDragEnd = useCallback(
    async (result) => {
      const { source, destination, type, draggableId } = result;

      // Dropped outside a droppable
      if (!destination) return;

      // Same spot
      if (source.droppableId === destination.droppableId && source.index === destination.index) return;

      // ── List reorder ────────────────────────────────────────────────────────
      if (type === "LIST") {
        const newLists = Array.from(lists);
        const [removed] = newLists.splice(source.index, 1);
        newLists.splice(destination.index, 0, removed);
        await reorderLists(boardId, newLists);
        return;
      }

      // ── Card move ───────────────────────────────────────────────────────────
      await moveCard(boardId, {
        cardId: draggableId,
        sourceListId: source.droppableId,
        destinationListId: destination.droppableId,
        sourceIndex: source.index,
        destinationIndex: destination.index,
      });
    },
    [lists, boardId, reorderLists, moveCard]
  );

  // ─── List actions ─────────────────────────────────────────────────────────────
  const handleCreateList = useCallback(
    (title) => createList(boardId, title),
    [boardId, createList]
  );

  const handleUpdateList = useCallback(
    (listId, updates) => updateList(boardId, listId, updates),
    [boardId, updateList]
  );

  const handleDeleteList = useCallback(
    (listId) => deleteList(boardId, listId),
    [boardId, deleteList]
  );

  // ─── Card actions ─────────────────────────────────────────────────────────────
  const handleAddCard = useCallback(
    (listId, title) => createCard(boardId, listId, { title }),
    [boardId, createCard]
  );

  const handleUpdateCard = useCallback(
    async (bId, listId, cardId, updates) => {
      return updateCard(bId, listId, cardId, updates);
    },
    [updateCard]
  );

  const handleDeleteCard = useCallback(
    (listId, cardId) => deleteCard(boardId, listId, cardId),
    [boardId, deleteCard]
  );

  const handleCardClick = useCallback((card, list) => {
    setSelectedCard(card);
    setSelectedList(list);
  }, []);

  // ─── Comment actions ──────────────────────────────────────────────────────────
  const handleAddComment = useCallback(async (bId, listId, cardId, text) => {
    try {
      const { data } = await api.post(`/boards/${bId}/cards/lists/${listId}/cards/${cardId}/comments`, { text });
      return { success: true, comment: data.comment };
    } catch {
      return { success: false };
    }
  }, []);

  const handleDeleteComment = useCallback(async (cardId, commentId) => {
    // Find the card's list
    const list = lists.find((l) => l.cards.some((c) => c._id === cardId));
    if (!list) return;
    try {
      await api.delete(`/boards/${boardId}/cards/lists/${list._id}/cards/${cardId}/comments/${commentId}`);
    } catch (err) {
      console.error("Failed to delete comment", err);
    }
  }, [boardId, lists]);

  // ─── Board background ─────────────────────────────────────────────────────────
  const bgStyle = board?.background
    ? { background: board.background.value }
    : { background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)" };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", ...bgStyle }}>
      {/* Board canvas */}
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="board" type="LIST" direction="horizontal">
          {(provided) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className="kanban-board"
            >
              {lists.map((list, index) => (
                <ListDraggableWrapper key={list._id} list={list} index={index}>
                  <KanbanList
                    list={list}
                    index={index}
                    boardLabels={board?.labels || []}
                    onUpdateList={handleUpdateList}
                    onDeleteList={handleDeleteList}
                    onAddCard={handleAddCard}
                    onCardClick={handleCardClick}
                    typingUsers={typingUsers.filter(
                      (u) => u.context === `card-list:${list._id}`
                    )}
                    emitTyping={emitTyping}
                  />
                </ListDraggableWrapper>
              ))}
              {provided.placeholder}

              {/* Add list */}
              <AddListForm onAdd={handleCreateList} />
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {/* Card detail modal */}
      {selectedCard && selectedList && (
        <CardDetailModal
          card={selectedCard}
          list={selectedList}
          board={board}
          boardId={boardId}
          currentUser={currentUser}
          onClose={() => { setSelectedCard(null); setSelectedList(null); }}
          onUpdate={handleUpdateCard}
          onDelete={handleDeleteCard}
          onAddComment={handleAddComment}
          onDeleteComment={handleDeleteComment}
          emitTyping={emitTyping}
        />
      )}
    </div>
  );
};

// ─── Draggable wrapper for lists ──────────────────────────────────────────────


const ListDraggableWrapper = ({ list, index, children }) => (
  <Draggable draggableId={list._id} index={index} type="LIST">
    {(provided, snapshot) => (
      <div
        ref={provided.innerRef}
        {...provided.draggableProps}
        {...provided.dragHandleProps}
        style={{
          ...provided.draggableProps.style,
          opacity: snapshot.isDragging ? 0.88 : 1,
          transform: snapshot.isDragging
            ? `${provided.draggableProps.style?.transform || ""} rotate(1deg)`
            : provided.draggableProps.style?.transform,
        }}
      >
        {children}
      </div>
    )}
  </Draggable>
);

export default KanbanBoard;
