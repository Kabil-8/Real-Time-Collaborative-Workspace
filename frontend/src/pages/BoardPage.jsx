import React, { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import {
  Plus, X, ArrowLeft, Star, Users, List, AlertCircle
} from "lucide-react";
import { fetchListsByBoard, moveList } from "../utils/listsApi";
import { moveCard } from "../utils/cardsApi";
import api from "../utils/api";
import ListColumn from "../components/board/ListColumn";
import CardDetailModal from "../components/board/CardDetailModal";
import { useTheme } from "../context/ThemeContext";

// ─── WIP Toast ─────────────────────────────────────────────────
const WipToast = ({ message, onDismiss }) => (
  <div
    className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3
      px-5 py-3.5 rounded-2xl shadow-2xl animate-scale-in"
    style={{
      background: "rgba(239,68,68,0.12)",
      border: "1px solid rgba(239,68,68,0.35)",
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      color: "#fca5a5",
    }}
  >
    <AlertCircle size={16} className="flex-shrink-0 text-red-400" />
    <span className="text-sm font-medium">{message}</span>
    <button
      onClick={onDismiss}
      className="ml-2 p-0.5 rounded-lg opacity-60 hover:opacity-100 transition-opacity"
    >
      <X size={13} />
    </button>
  </div>
);

// ─── Add-list form ─────────────────────────────────────────────
const AddListForm = ({ boardId, onListAdded }) => {
  const { isDark } = useTheme();
  const [open, setOpen]     = useState(false);
  const [title, setTitle]   = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);
    try {
      const { data } = await api.post("/lists", { title: title.trim(), boardId });
      onListAdded(data.list);
      setTitle(""); setOpen(false);
    } catch (err) { console.error("Failed to create list:", err); }
    finally { setLoading(false); }
  };

  if (!open) return (
    <button onClick={() => setOpen(true)}
      className="flex-shrink-0 w-72 h-12 flex items-center gap-2.5 px-4 rounded-2xl
        bg-white/5 hover:bg-white/10 border border-dashed border-white/20
        hover:border-white/30 text-white/50 hover:text-white/80
        transition-all duration-200 text-sm font-medium group backdrop-blur-sm">
      <Plus size={16} className="transition-transform group-hover:rotate-90 duration-200" />
      Add another list
    </button>
  );

  return (
    <div className="flex-shrink-0 w-72 glass-dark rounded-2xl p-3 animate-scale-in">
      <form onSubmit={handleSubmit} className="space-y-2">
        <input autoFocus value={title} onChange={e => setTitle(e.target.value)}
          onKeyDown={e => e.key === "Escape" && setOpen(false)}
          placeholder="List name…" className="input-field text-sm" />
        <div className="flex gap-2">
          <button type="submit" disabled={loading || !title.trim()}
            className="flex-1 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600
              hover:from-violet-500 hover:to-indigo-500 text-white text-xs
              font-semibold disabled:opacity-50 transition-all">
            {loading ? "Adding…" : "Add list"}
          </button>
          <button type="button" onClick={() => { setOpen(false); setTitle(""); }}
            className="p-2 rounded-xl bg-white/10 text-white/60 hover:text-white transition-colors">
            <X size={14} />
          </button>
        </div>
      </form>
    </div>
  );
};

// ─── Board header ───────────────────────────────────────────────
const BoardHeader = ({ board, onBack, listCount }) => {
  const { isDark } = useTheme();
  const [starred, setStarred] = useState(board?.isStarred || false);

  const toggleStar = async () => {
    try {
      await api.patch(`/boards/${board._id}`, { isStarred: !starred });
      setStarred(s => !s);
    } catch (err) { console.error(err); }
  };

  return (
    <div className="flex items-center gap-3 px-5 py-3 flex-shrink-0"
      style={{
        borderBottom: isDark ? "1px solid rgba(255,255,255,0.10)" : "1px solid rgba(0,0,0,0.08)",
        background: isDark ? "rgba(0,0,0,0.20)" : "rgba(255,255,255,0.85)",
        backdropFilter: "blur(16px)",
      }}>
      <button onClick={onBack} className="p-1.5 rounded-xl transition-all"
        style={{ background: isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.06)", color: isDark ? "rgba(255,255,255,0.70)" : "#374151" }}
        title="Back to home">
        <ArrowLeft size={16} />
      </button>
      <span className="w-px h-5" style={{ background: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.10)" }} />
      <h1 className="text-sm font-bold flex-1 truncate" style={{ color: isDark ? "#fff" : "#111827" }}>
        {board?.title || "Board"}
      </h1>
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
        style={{ background: isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.06)", color: isDark ? "rgba(255,255,255,0.70)" : "#6b7280" }}>
        <List size={11} /> {listCount} lists
      </div>
      {board?.members?.length > 0 && (
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
          style={{ background: isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.06)", color: isDark ? "rgba(255,255,255,0.70)" : "#6b7280" }}>
          <Users size={11} /> {board.members.length}
        </div>
      )}
      <button onClick={toggleStar} className="p-1.5 rounded-xl transition-all"
        style={{
          background: starred ? "rgba(234,179,8,0.20)" : isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.06)",
          color: starred ? "#fde047" : isDark ? "rgba(255,255,255,0.50)" : "#9ca3af",
        }}
        title={starred ? "Unstar board" : "Star board"}>
        <Star size={15} className={starred ? "fill-yellow-300" : ""} />
      </button>
    </div>
  );
};

// ─── Main Board Page ────────────────────────────────────────────
const BoardPage = () => {
  const { boardId } = useParams();
  const navigate    = useNavigate();
  const { isDark }  = useTheme();

  const [board,  setBoard]  = useState(null);
  const [lists,  setLists]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");
  const [activeCardId, setActiveCardId] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [wipToast, setWipToast] = useState("");

  // Keep a ref always pointing at the latest lists — prevents stale closure
  // inside onDragEnd when reverting optimistic updates
  const listsRef = useRef(lists);
  useEffect(() => { listsRef.current = lists; }, [lists]);

  const loadBoard = useCallback(async () => {
    if (!boardId) return;
    setLoading(true); setError("");
    try {
      const [boardRes, fetchedLists] = await Promise.all([
        api.get(`/boards/${boardId}`),
        fetchListsByBoard(boardId),
      ]);
      setBoard(boardRes.data.board);
      setLists(fetchedLists || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load board.");
    } finally { setLoading(false); }
  }, [boardId]);

  useEffect(() => { loadBoard(); }, [loadBoard]);

  /* ── List event handlers ── */
  const handleListAdded      = (nl)  => setLists(prev => [...prev, { ...nl, cardOrder: [] }]);
  const handleListDeleted    = (id)  => setLists(prev => prev.filter(l => l._id !== id));
  const handleListUpdated    = (upd) => setLists(prev => prev.map(l => l._id === upd._id ? { ...l, ...upd } : l));
  const handleListDuplicated = (nl)  => setLists(prev => [...prev, nl]);

  /* ── Card event handlers ── */
  const handleCardAdded = (listId, newCard) =>
    setLists(prev => prev.map(l =>
      l._id === listId ? { ...l, cardOrder: [...(l.cardOrder || []), newCard] } : l
    ));

  const handleCardUpdated = (updatedCard, action) => {
    if (action === "move") {
      setLists(prev => prev.map(l => ({
        ...l,
        cardOrder: l._id === (updatedCard.list?._id || updatedCard.list)
          ? [...(l.cardOrder || []), updatedCard]
          : (l.cardOrder || []).filter(c => c._id !== updatedCard._id),
      })));
      return;
    }
    if (action === "duplicate") {
      setLists(prev => prev.map(l =>
        l._id === (updatedCard.list?._id || updatedCard.list)
          ? { ...l, cardOrder: [...(l.cardOrder || []), updatedCard] }
          : l
      ));
      return;
    }
    if (updatedCard.isArchived) {
      setLists(prev => prev.map(l => ({
        ...l,
        cardOrder: (l.cardOrder || []).filter(c => c._id !== updatedCard._id),
      })));
      return;
    }
    setLists(prev => prev.map(l => ({
      ...l,
      cardOrder: (l.cardOrder || []).map(c =>
        c._id === updatedCard._id ? { ...c, ...updatedCard } : c
      ),
    })));
  };

  /* ── Drag-and-drop handler ─────────────────────────────────── */
  const onDragStart = useCallback(() => {
    setIsDragging(true);
    // Prevent text selection during drag on touch devices
    document.body.style.userSelect = "none";
  }, []);

  const onDragEnd = useCallback(async (result) => {
    setIsDragging(false);
    document.body.style.userSelect = "";

    const { source, destination, type, draggableId } = result;

    // Dropped outside a droppable or in the same spot → no-op
    if (!destination) return;
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) return;

    // Capture current lists from ref (avoids stale closure)
    const currentLists = listsRef.current;

    // ── LIST reorder ──────────────────────────────────────────
    if (type === "LIST") {
      const reordered = Array.from(currentLists);
      const [removed] = reordered.splice(source.index, 1);
      reordered.splice(destination.index, 0, removed);
      setLists(reordered); // optimistic update

      try {
        await moveList(draggableId, destination.index);
      } catch (err) {
        console.error("Failed to persist list move:", err);
        setLists(currentLists); // revert using captured snapshot
      }
      return;
    }

    // ── CARD move ─────────────────────────────────────────────
    const sourceList = currentLists.find(l => l._id === source.droppableId);
    const destList   = currentLists.find(l => l._id === destination.droppableId);
    if (!sourceList || !destList) return;

    // WIP pre-flight check (client-side) — prevent cross-list if already at cap
    const isCross = source.droppableId !== destination.droppableId;
    if (isCross && destList.wipLimit) {
      const destCardCount = (destList.cardOrder || []).length;
      if (destCardCount >= destList.wipLimit) {
        setWipToast(
          `"${destList.title}" is at its WIP limit (${destList.wipLimit}). Move or archive a card first.`
        );
        setTimeout(() => setWipToast(""), 5000);
        return; // block the drop
      }
    }

    const sourceCards = Array.from(sourceList.cardOrder || []);
    const [movedCard] = sourceCards.splice(source.index, 1);

    if (!isCross) {
      // Same-list reorder
      sourceCards.splice(destination.index, 0, movedCard);
      setLists(prev =>
        prev.map(l =>
          l._id === source.droppableId
            ? { ...l, cardOrder: sourceCards }
            : l
        )
      );
    } else {
      // Cross-list move — optimistic update
      const destCards = Array.from(destList.cardOrder || []);
      destCards.splice(destination.index, 0, movedCard);
      setLists(prev =>
        prev.map(l => {
          if (l._id === source.droppableId) return { ...l, cardOrder: sourceCards };
          if (l._id === destination.droppableId) return { ...l, cardOrder: destCards };
          return l;
        })
      );
    }

    // Persist to backend
    try {
      await moveCard(movedCard._id, {
        targetListId: destination.droppableId,
        newPosition: destination.index,
      });
    } catch (err) {
      console.error("Failed to persist card move:", err);
      // Surface WIP errors from server
      const msg = err?.response?.data?.message;
      if (msg) {
        setWipToast(msg);
        setTimeout(() => setWipToast(""), 5000);
      }
      // Revert to server state
      loadBoard();
    }
  }, [loadBoard]);

  if (loading) return (
    <div className="flex-1 flex items-center justify-center bg-slate-950 h-full">
      <div className="flex flex-col items-center gap-4">
        <div className="spinner-gradient" />
        <p className="text-slate-500 text-sm">Loading board…</p>
      </div>
    </div>
  );

  if (error || !board) return (
    <div className="flex-1 flex flex-col items-center justify-center text-center py-20 animate-fade-in">
      <div className="w-16 h-16 rounded-2xl glass flex items-center justify-center text-3xl mb-4">🗂️</div>
      <h3 className="text-lg font-bold text-white mb-2">Board not found</h3>
      <p className="text-slate-500 text-sm mb-6">{error || "This board doesn't exist or you don't have access."}</p>
      <button onClick={() => navigate("/")} className="btn-primary">Back to home</button>
    </div>
  );

  const boardBg = isDark
    ? (board.background?.value || "linear-gradient(135deg, #667eea 0%, #764ba2 100%)")
    : "linear-gradient(135deg, #e0e7ff 0%, #f3e8ff 50%, #e0f2fe 100%)";

  return (
    <div className="flex flex-col h-full relative" style={{ background: boardBg }}>
      <div className="absolute inset-0 pointer-events-none"
        style={{
          background: isDark
            ? "linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.15) 40%, rgba(0,0,0,0.40) 100%)"
            : "linear-gradient(to bottom, rgba(255,255,255,0.20) 0%, rgba(255,255,255,0.05) 100%)"
        }} />

      <div className="relative flex flex-col h-full">
        <BoardHeader board={board} onBack={() => navigate("/")} listCount={lists.length} />

        {/* ── DnD Context wraps the entire board canvas ── */}
        <DragDropContext onDragStart={onDragStart} onDragEnd={onDragEnd}>
          {/* Droppable for list-level reordering (horizontal) */}
          <Droppable
            droppableId="board-lists"
            direction="horizontal"
            type="LIST"
          >
            {(provided, snapshot) => (
              <div
                className="flex-1 overflow-x-auto overflow-y-hidden"
                ref={provided.innerRef}
                {...provided.droppableProps}
              >
                <div
                  className={`flex gap-4 p-6 h-full items-start min-w-max dnd-board-canvas${
                    isDragging ? " is-dragging" : ""
                  }`}
                  style={{
                    transition: "background 0.25s ease",
                    background: snapshot.isDraggingOver
                      ? isDark
                        ? "rgba(124,58,237,0.05)"
                        : "rgba(124,58,237,0.03)"
                      : "transparent",
                  }}
                >
                  {lists.map((list, idx) => (
                    <Draggable
                      key={list._id}
                      draggableId={list._id}
                      index={idx}
                    >
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={snapshot.isDragging ? "dnd-list-dragging" : ""}
                          style={{
                            ...provided.draggableProps.style,
                            // Keep the ghost visible but slightly faded
                            opacity: snapshot.isDragging ? 0.90 : 1,
                          }}
                        >
                          <ListColumn
                            list={list}
                            boardId={boardId}
                            index={idx}
                            onCardAdded={handleCardAdded}
                            onListDeleted={handleListDeleted}
                            onListUpdated={handleListUpdated}
                            onListDuplicated={handleListDuplicated}
                            onCardClick={(card) => setActiveCardId(card._id)}
                            dragHandleProps={provided.dragHandleProps}
                            isDraggingList={snapshot.isDragging}
                          />
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                  <AddListForm boardId={boardId} onListAdded={handleListAdded} />
                </div>
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>

      {activeCardId && (
        <CardDetailModal
          cardId={activeCardId}
          boardId={boardId}
          onClose={() => setActiveCardId(null)}
          onCardUpdated={handleCardUpdated}
        />
      )}

      {/* WIP limit violation toast */}
      {wipToast && (
        <WipToast message={wipToast} onDismiss={() => setWipToast("")} />
      )}
    </div>
  );
};

export default BoardPage;
