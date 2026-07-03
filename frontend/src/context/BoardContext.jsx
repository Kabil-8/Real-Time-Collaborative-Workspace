/**
 * BoardContext.jsx
 * ─────────────────────────────────────────────────────────────────
 * Central state for a single Kanban board.
 *
 * Real-time events handled (Day 3-5 complete):
 *   card:created    card:updated    card:moved
 *   card:archived   card:restored   card:duplicated
 *   list:created    list:updated    list:archived
 *   list:restored   list:duplicated list:reordered
 *
 * Self-deduplication:
 *   Every Axios request carries `x-socket-id` (injected by an
 *   interceptor below).  The backend writes that value into every
 *   socket payload as `originSocketId`.  When a client receives
 *   an event whose `originSocketId === socket.id`, it skips the
 *   handler — its own optimistic update already applied the change.
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
import useTypingIndicator from "../hooks/useTypingIndicator";

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
  const { socket, socketId } = useSocket(boardId);

  // ── Typing indicators ──────────────────────────────────────────
  const { emitTyping, emitStopTyping, getTypistsFor } = useTypingIndicator(socket, boardId);

  // Keep a ref so Axios interceptors added inside effects can always
  // read the current socket id without re-registering.
  const socketIdRef = useRef(socketId);
  useEffect(() => { socketIdRef.current = socketId; }, [socketId]);

  // ── Inject x-socket-id into every Axios request ────────────────
  // The backend reads this header and echoes it back as originSocketId
  // so each client can skip its own optimistic events.
  useEffect(() => {
    const interceptorId = api.interceptors.request.use((config) => {
      const sid = socketIdRef.current;
      if (sid) config.headers["x-socket-id"] = sid;
      return config;
    });
    return () => api.interceptors.request.eject(interceptorId);
  }, []); // runs once per BoardProvider mount

  // Separate mutation trackers for lists vs cards
  const { mutate: mutateList, pendingIds: pendingListIds } = useOptimisticMutation();
  const { mutate: mutateCard, pendingIds: pendingCardIds  } = useOptimisticMutation();

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

  // ── Helper: is this event from ourselves? ───────────────────────
  // If yes, skip — the optimistic update already handled it.
  const isSelf = useCallback(
    (originSocketId) => !!originSocketId && originSocketId === socketIdRef.current,
    []
  );

  // ════════════════════════════════════════════════════════════════
  //  CARD SOCKET HANDLERS
  // ════════════════════════════════════════════════════════════════

  // ── card:created ─────────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;
    const handler = ({ boardId: eid, card, originSocketId }) => {
      if (eid !== boardId || isSelf(originSocketId)) return;
      setLists((prev) =>
        prev.map((l) => {
          if (l._id !== (card.list?._id || card.list)) return l;
          const exists = (l.cardOrder || []).some((c) => c._id === card._id);
          if (exists) return l;
          return { ...l, cardOrder: [...(l.cardOrder || []), card] };
        })
      );
    };
    socket.on("card:created", handler);
    return () => socket.off("card:created", handler);
  }, [socket, boardId, isSelf]);

  // ── card:updated ─────────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;
    const handler = ({ boardId: eid, card, originSocketId }) => {
      if (eid !== boardId || isSelf(originSocketId)) return;
      setLists((prev) =>
        prev.map((l) => ({
          ...l,
          cardOrder: (l.cardOrder || []).map((c) =>
            c._id === card._id ? { ...c, ...card } : c
          ),
        }))
      );
    };
    socket.on("card:updated", handler);
    return () => socket.off("card:updated", handler);
  }, [socket, boardId, isSelf]);

  // ── card:moved ───────────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;
    const handler = ({ boardId: eid, cardId, sourceListId, destListId, newPosition, card, originSocketId }) => {
      if (eid !== boardId || isSelf(originSocketId)) return;
      setLists((prev) => {
        let movedCard = card;
        if (!movedCard) {
          for (const l of prev) {
            const found = (l.cardOrder || []).find((c) => c._id === cardId);
            if (found) { movedCard = found; break; }
          }
        }
        if (!movedCard) return prev;

        const isCross = sourceListId !== destListId;
        return prev.map((l) => {
          if (l._id === sourceListId) {
            const filtered = (l.cardOrder || []).filter((c) => c._id !== cardId);
            if (!isCross) {
              const clamped = Math.min(newPosition, filtered.length);
              filtered.splice(clamped, 0, { ...movedCard, list: destListId });
              return { ...l, cardOrder: filtered };
            }
            return { ...l, cardOrder: filtered };
          }
          if (isCross && l._id === destListId) {
            const dest = (l.cardOrder || []).filter((c) => c._id !== cardId);
            const clamped = Math.min(newPosition, dest.length);
            dest.splice(clamped, 0, { ...movedCard, list: destListId });
            return { ...l, cardOrder: dest };
          }
          return l;
        });
      });
    };
    socket.on("card:moved", handler);
    return () => socket.off("card:moved", handler);
  }, [socket, boardId, isSelf]);

  // ── card:archived ────────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;
    const handler = ({ boardId: eid, cardId, originSocketId }) => {
      if (eid !== boardId || isSelf(originSocketId)) return;
      setLists((prev) =>
        prev.map((l) => ({
          ...l,
          cardOrder: (l.cardOrder || []).filter((c) => c._id !== cardId),
        }))
      );
    };
    socket.on("card:archived", handler);
    return () => socket.off("card:archived", handler);
  }, [socket, boardId, isSelf]);

  // ── card:restored ────────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;
    const handler = ({ boardId: eid, card, originSocketId }) => {
      if (eid !== boardId || isSelf(originSocketId)) return;
      // Append to the target list (deduplicated)
      setLists((prev) =>
        prev.map((l) => {
          if (l._id !== (card.list?._id || card.list)) return l;
          const exists = (l.cardOrder || []).some((c) => c._id === card._id);
          if (exists) return l;
          return { ...l, cardOrder: [...(l.cardOrder || []), card] };
        })
      );
    };
    socket.on("card:restored", handler);
    return () => socket.off("card:restored", handler);
  }, [socket, boardId, isSelf]);

  // ── card:duplicated ──────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;
    const handler = ({ boardId: eid, card, originSocketId }) => {
      if (eid !== boardId || isSelf(originSocketId)) return;
      setLists((prev) =>
        prev.map((l) => {
          if (l._id !== (card.list?._id || card.list)) return l;
          const exists = (l.cardOrder || []).some((c) => c._id === card._id);
          if (exists) return l;
          return { ...l, cardOrder: [...(l.cardOrder || []), card] };
        })
      );
    };
    socket.on("card:duplicated", handler);
    return () => socket.off("card:duplicated", handler);
  }, [socket, boardId, isSelf]);

  // ════════════════════════════════════════════════════════════════
  //  LIST SOCKET HANDLERS
  // ════════════════════════════════════════════════════════════════

  // ── list:created ─────────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;
    const handler = ({ boardId: eid, list, originSocketId }) => {
      if (eid !== boardId || isSelf(originSocketId)) return;
      setLists((prev) => {
        const exists = prev.some((l) => l._id === list._id);
        if (exists) return prev;
        return [...prev, { ...list, cardOrder: list.cardOrder || [] }];
      });
    };
    socket.on("list:created", handler);
    return () => socket.off("list:created", handler);
  }, [socket, boardId, isSelf]);

  // ── list:updated ─────────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;
    const handler = ({ boardId: eid, list, originSocketId }) => {
      if (eid !== boardId || isSelf(originSocketId)) return;
      setLists((prev) =>
        prev.map((l) => (l._id === list._id ? { ...l, ...list } : l))
      );
    };
    socket.on("list:updated", handler);
    return () => socket.off("list:updated", handler);
  }, [socket, boardId, isSelf]);

  // ── list:archived ────────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;
    const handler = ({ boardId: eid, listId, originSocketId }) => {
      if (eid !== boardId || isSelf(originSocketId)) return;
      setLists((prev) => prev.filter((l) => l._id !== listId));
    };
    socket.on("list:archived", handler);
    return () => socket.off("list:archived", handler);
  }, [socket, boardId, isSelf]);

  // ── list:restored ────────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;
    const handler = ({ boardId: eid, list, originSocketId }) => {
      if (eid !== boardId || isSelf(originSocketId)) return;
      setLists((prev) => {
        const exists = prev.some((l) => l._id === list._id);
        if (exists) return prev;
        return [...prev, list];
      });
    };
    socket.on("list:restored", handler);
    return () => socket.off("list:restored", handler);
  }, [socket, boardId, isSelf]);

  // ── list:duplicated ──────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;
    const handler = ({ boardId: eid, list, originSocketId }) => {
      if (eid !== boardId || isSelf(originSocketId)) return;
      setLists((prev) => {
        const exists = prev.some((l) => l._id === list._id);
        if (exists) return prev;
        return [...prev, list];
      });
    };
    socket.on("list:duplicated", handler);
    return () => socket.off("list:duplicated", handler);
  }, [socket, boardId, isSelf]);

  // ── list:reordered ───────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;
    const handler = ({ boardId: eid, listId, fromIndex, toIndex, originSocketId }) => {
      if (eid !== boardId || isSelf(originSocketId)) return;
      setLists((prev) => {
        const idx = prev.findIndex((l) => l._id === listId);
        if (idx === -1) return prev;
        const reordered = Array.from(prev);
        const [removed] = reordered.splice(idx, 1);
        reordered.splice(toIndex, 0, removed);
        return reordered;
      });
    };
    socket.on("list:reordered", handler);
    return () => socket.off("list:reordered", handler);
  }, [socket, boardId, isSelf]);

  // ════════════════════════════════════════════════════════════════
  //  LIST MUTATION DISPATCHERS
  // ════════════════════════════════════════════════════════════════

  const optimisticRenameList = useCallback(
    (listId, newTitle) => {
      mutateList({
        entityId: listId,
        getSnapshot: () => listsRef.current,
        optimisticUpdate: () =>
          setLists((prev) =>
            prev.map((l) => (l._id === listId ? { ...l, title: newTitle } : l))
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

  const optimisticSetWipLimit = useCallback(
    (listId, wipLimit) => {
      mutateList({
        entityId: listId,
        getSnapshot: () => listsRef.current,
        optimisticUpdate: () =>
          setLists((prev) =>
            prev.map((l) => (l._id === listId ? { ...l, wipLimit } : l))
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

  const optimisticAddCard = useCallback(
    (listId, tempCard, createFn) => {
      const tempId = tempCard._id;
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

  // ── Legacy helpers (used by BoardPage / ListColumn) ─────────────
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

        // Presence
        socketId,

        // Pending indicators
        pendingListIds,
        pendingCardIds,

        // Typing indicators (Day 6-7)
        emitTyping,
        emitStopTyping,
        getTypistsFor,

        // Optimistic dispatchers
        optimisticRenameList,
        optimisticSetWipLimit,
        optimisticAddCard,
        optimisticUpdateCard,
        optimisticArchiveCard,
        optimisticMoveList,
        optimisticMoveCard,

        // Legacy handlers (duplicate/restore flows)
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
