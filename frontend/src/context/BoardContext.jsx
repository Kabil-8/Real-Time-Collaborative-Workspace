/**
 * BoardContext.jsx
 * ─────────────────────────────────────────────────────────────────
 * Central state for a single Kanban board.
 *
 * Provides:
 *  - lists / setLists
 *  - board / setBoard
 *  - pendingListIds, pendingCardIds   (Sets for loading indicators)
 *  - Optimistic action dispatchers:
 *      optimisticRenameList(listId, newTitle)
 *      optimisticSetWipLimit(listId, wipLimit)
 *      optimisticAddCard(listId, tempCard)  → resolves with real card
 *      optimisticMoveCard(cardId, src, dest, sourceListId, destListId)
 *      optimisticArchiveCard(cardId, listId)
 *      optimisticUpdateCard(cardId, patch)   — for modal field edits
 *      optimisticMoveList(fromIdx, toIdx, listId)
 *  - toast helper (via useToast)
 *  - loadBoard() to hard-refresh from server
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { fetchListsByBoard, updateList, moveList } from "../utils/listsApi";
import { moveCard, updateCard } from "../utils/cardsApi";
import api from "../utils/api";
import useOptimisticMutation from "../hooks/useOptimisticMutation";
import { useToast } from "../hooks/useToast";
import useSocket from "../hooks/useSocket";

// ── Context ────────────────────────────────────────────────────────
const BoardContext = createContext(null);

// ── Provider ───────────────────────────────────────────────────────
export const BoardProvider = ({ boardId, children }) => {
  const { toast } = useToast();

  const [board,   setBoard]   = useState(null);
  const [lists,   setLists]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  // ── Socket connection for this board room ───────────────────────
  const socket = useSocket(boardId);

  // Separate mutation trackers for lists vs cards
  const {
    mutate: mutateList,
    pendingIds: pendingListIds,
  } = useOptimisticMutation();

  const {
    mutate: mutateCard,
    pendingIds: pendingCardIds,
  } = useOptimisticMutation();

  // Always-fresh ref to avoid stale closures in DnD callbacks
  const listsRef = useRef(lists);
  useEffect(() => { listsRef.current = lists; }, [lists]);

  // ── Load board ──────────────────────────────────────────────────
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
    } finally {
      setLoading(false);
    }
  }, [boardId]);

  useEffect(() => { loadBoard(); }, [loadBoard]);

  // ── Real-time: card:updated ──────────────────────────────────────
  // When another collaborator updates a card, merge the changes into
  // local state so this client sees the update without a refresh.
  useEffect(() => {
    if (!socket) return;

    const handleCardUpdated = ({ boardId: eventBoardId, card }) => {
      // Guard: only handle events for THIS board
      if (eventBoardId !== boardId) return;

      setLists((prev) =>
        prev.map((l) => ({
          ...l,
          cardOrder: (l.cardOrder || []).map((c) =>
            c._id === card._id ? { ...c, ...card } : c
          ),
        }))
      );
    };

    socket.on("card:updated", handleCardUpdated);
    return () => socket.off("card:updated", handleCardUpdated);
  }, [socket, boardId]);

  // ── List handlers ───────────────────────────────────────────────

  /** Optimistically rename a list; rolls back on server error. */
  const optimisticRenameList = useCallback(
    (listId, newTitle) => {
      mutateList({
        entityId: listId,
        getSnapshot: () => listsRef.current,
        optimisticUpdate: () =>
          setLists((prev) =>
            prev.map((l) =>
              l._id === listId ? { ...l, title: newTitle } : l
            )
          ),
        mutationFn: () => updateList(listId, { title: newTitle }),
        onSuccess: (updated) =>
          setLists((prev) =>
            prev.map((l) => (l._id === listId ? { ...l, ...updated } : l))
          ),
        onError: (_err, snapshot) => {
          setLists(snapshot);
          toast.error("Failed to rename list — changes reverted.");
        },
      });
    },
    [mutateList, toast]
  );

  /** Optimistically set WIP limit; rolls back on server error. */
  const optimisticSetWipLimit = useCallback(
    (listId, wipLimit) => {
      mutateList({
        entityId: listId,
        getSnapshot: () => listsRef.current,
        optimisticUpdate: () =>
          setLists((prev) =>
            prev.map((l) =>
              l._id === listId ? { ...l, wipLimit } : l
            )
          ),
        mutationFn: () => updateList(listId, { wipLimit }),
        onSuccess: (updated) =>
          setLists((prev) =>
            prev.map((l) => (l._id === listId ? { ...l, ...updated } : l))
          ),
        onError: (_err, snapshot) => {
          setLists(snapshot);
          toast.error("Failed to update WIP limit — changes reverted.");
        },
      });
    },
    [mutateList, toast]
  );

  /** Add card with temp optimistic entry; replaced by server card on success. */
  const optimisticAddCard = useCallback(
    (listId, tempCard, createFn) => {
      const tempId = tempCard._id; // caller supplies a temp _id
      mutateCard({
        entityId: tempId,
        getSnapshot: () => listsRef.current,
        optimisticUpdate: () =>
          setLists((prev) =>
            prev.map((l) =>
              l._id === listId
                ? { ...l, cardOrder: [...(l.cardOrder || []), tempCard] }
                : l
            )
          ),
        mutationFn: createFn,
        onSuccess: (realCard) => {
          // Swap temp card for real server card
          setLists((prev) =>
            prev.map((l) =>
              l._id === listId
                ? {
                    ...l,
                    cardOrder: (l.cardOrder || []).map((c) =>
                      c._id === tempId ? realCard : c
                    ),
                  }
                : l
            )
          );
          toast.success("Card added.");
        },
        onError: (_err, snapshot) => {
          setLists(snapshot);
          toast.error("Failed to add card — changes reverted.");
        },
      });
    },
    [mutateCard, toast]
  );

  /** Optimistic card field update (title, priority, dueDate, etc.). */
  const optimisticUpdateCard = useCallback(
    (cardId, patch) => {
      mutateCard({
        entityId: cardId,
        getSnapshot: () => listsRef.current,
        optimisticUpdate: () =>
          setLists((prev) =>
            prev.map((l) => ({
              ...l,
              cardOrder: (l.cardOrder || []).map((c) =>
                c._id === cardId ? { ...c, ...patch } : c
              ),
            }))
          ),
        mutationFn: () => updateCard(cardId, patch),
        onSuccess: (updated) =>
          setLists((prev) =>
            prev.map((l) => ({
              ...l,
              cardOrder: (l.cardOrder || []).map((c) =>
                c._id === cardId ? { ...c, ...updated } : c
              ),
            }))
          ),
        onError: (_err, snapshot) => {
          setLists(snapshot);
          toast.error("Failed to save — changes reverted.");
        },
      });
    },
    [mutateCard, toast]
  );

  /** Optimistic card archive (remove from UI immediately). */
  const optimisticArchiveCard = useCallback(
    (cardId, confirmFn) => {
      mutateCard({
        entityId: cardId,
        getSnapshot: () => listsRef.current,
        optimisticUpdate: () =>
          setLists((prev) =>
            prev.map((l) => ({
              ...l,
              cardOrder: (l.cardOrder || []).filter((c) => c._id !== cardId),
            }))
          ),
        mutationFn: confirmFn,
        onSuccess: () => toast.success("Card archived."),
        onError: (_err, snapshot) => {
          setLists(snapshot);
          toast.error("Failed to archive card — changes reverted.");
        },
      });
    },
    [mutateCard, toast]
  );

  /** Optimistic list reorder (DnD). */
  const optimisticMoveList = useCallback(
    (fromIdx, toIdx, listId) => {
      const snapshot = listsRef.current;
      const reordered = Array.from(snapshot);
      const [removed] = reordered.splice(fromIdx, 1);
      reordered.splice(toIdx, 0, removed);

      mutateList({
        entityId: listId,
        optimisticUpdate: () => setLists(reordered),
        mutationFn: () => moveList(listId, toIdx),
        onError: (_err, _snap) => {
          setLists(snapshot);
          toast.error("Failed to reorder list — reverted.");
        },
      });
    },
    [mutateList, toast]
  );

  /** Optimistic card move (DnD or modal). */
  const optimisticMoveCard = useCallback(
    (movedCard, sourceListId, destListId, sourceIdx, destIdx) => {
      const snapshot = listsRef.current;

      const sourceList = snapshot.find((l) => l._id === sourceListId);
      const destList   = snapshot.find((l) => l._id === destListId);
      if (!sourceList || !destList) return;

      const sourceCards = Array.from(sourceList.cardOrder || []);
      const [card] = sourceCards.splice(sourceIdx, 1);

      const isCross = sourceListId !== destListId;

      let newLists;
      if (!isCross) {
        sourceCards.splice(destIdx, 0, card);
        newLists = snapshot.map((l) =>
          l._id === sourceListId ? { ...l, cardOrder: sourceCards } : l
        );
      } else {
        const destCards = Array.from(destList.cardOrder || []);
        destCards.splice(destIdx, 0, card);
        newLists = snapshot.map((l) => {
          if (l._id === sourceListId) return { ...l, cardOrder: sourceCards };
          if (l._id === destListId)   return { ...l, cardOrder: destCards };
          return l;
        });
      }

      mutateCard({
        entityId: movedCard._id,
        optimisticUpdate: () => setLists(newLists),
        mutationFn: () =>
          moveCard(movedCard._id, {
            targetListId: destListId,
            newPosition: destIdx,
          }),
        onError: (err, _snap) => {
          setLists(snapshot);
          const msg = err?.response?.data?.message;
          toast.error(msg || "Failed to move card — reverted.");
        },
      });
    },
    [mutateCard, toast]
  );

  // ── Card list-level helpers (used by BoardPage legacy handlers) ──
  const handleListAdded      = useCallback((nl)  => setLists((prev) => [...prev, { ...nl, cardOrder: [] }]), []);
  const handleListDeleted    = useCallback((id)  => setLists((prev) => prev.filter((l) => l._id !== id)), []);
  const handleListUpdated    = useCallback((upd) => setLists((prev) => prev.map((l) => l._id === upd._id ? { ...l, ...upd } : l)), []);
  const handleListDuplicated = useCallback((nl)  => setLists((prev) => [...prev, nl]), []);

  const handleCardAdded = useCallback((listId, newCard) =>
    setLists((prev) =>
      prev.map((l) =>
        l._id === listId ? { ...l, cardOrder: [...(l.cardOrder || []), newCard] } : l
      )
    ), []);

  const handleCardUpdated = useCallback((updatedCard, action) => {
    if (action === "move") {
      setLists((prev) =>
        prev.map((l) => ({
          ...l,
          cardOrder:
            l._id === (updatedCard.list?._id || updatedCard.list)
              ? [...(l.cardOrder || []), updatedCard]
              : (l.cardOrder || []).filter((c) => c._id !== updatedCard._id),
        }))
      );
      return;
    }
    if (action === "duplicate") {
      setLists((prev) =>
        prev.map((l) =>
          l._id === (updatedCard.list?._id || updatedCard.list)
            ? { ...l, cardOrder: [...(l.cardOrder || []), updatedCard] }
            : l
        )
      );
      return;
    }
    if (updatedCard.isArchived) {
      setLists((prev) =>
        prev.map((l) => ({
          ...l,
          cardOrder: (l.cardOrder || []).filter((c) => c._id !== updatedCard._id),
        }))
      );
      return;
    }
    setLists((prev) =>
      prev.map((l) => ({
        ...l,
        cardOrder: (l.cardOrder || []).map((c) =>
          c._id === updatedCard._id ? { ...c, ...updatedCard } : c
        ),
      }))
    );
  }, []);

  return (
    <BoardContext.Provider
      value={{
        board,
        setBoard,
        lists,
        setLists,
        loading,
        error,
        loadBoard,
        listsRef,

        // Pending indicators
        pendingListIds,
        pendingCardIds,

        // Optimistic dispatchers
        optimisticRenameList,
        optimisticSetWipLimit,
        optimisticAddCard,
        optimisticUpdateCard,
        optimisticArchiveCard,
        optimisticMoveList,
        optimisticMoveCard,

        // Legacy handlers (still used for duplicate/restore flows)
        handleListAdded,
        handleListDeleted,
        handleListUpdated,
        handleListDuplicated,
        handleCardAdded,
        handleCardUpdated,
      }}
    >
      {children}
    </BoardContext.Provider>
  );
};

// ── Hook ───────────────────────────────────────────────────────────
export const useBoardContext = () => {
  const ctx = useContext(BoardContext);
  if (!ctx) throw new Error("useBoardContext must be used within <BoardProvider>");
  return ctx;
};

export default BoardContext;
