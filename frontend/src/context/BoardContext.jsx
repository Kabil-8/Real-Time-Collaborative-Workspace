import { create } from "zustand";
import api from "../utils/api";

// ─── Types for board state ────────────────────────────────────────────────────
// board: { _id, title, background, members, labels, ... }
// lists: [{ _id, title, position, color, wipLimit, cards: [...] }]

const useBoardStore = create((set, get) => ({
  board: null,
  lists: [],       // ordered array of list objects with embedded cards
  isLoading: false,
  error: null,
  pendingOps: {},  // { opId: true } — track in-flight requests for optimistic UI

  // ─── Load board ─────────────────────────────────────────────────────────────
  fetchBoard: async (boardId) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.get(`/boards/${boardId}`);
      set({
        board: data.board,
        lists: data.lists || [],
        isLoading: false,
      });
    } catch (err) {
      set({ error: err.response?.data?.message || "Failed to load board.", isLoading: false });
    }
  },

  // ─── List operations ─────────────────────────────────────────────────────────

  createList: async (boardId, title) => {
    // Optimistic: add a placeholder
    const tempId = `temp-${Date.now()}`;
    const optimisticList = {
      _id: tempId,
      title,
      position: get().lists.length,
      cards: [],
      color: null,
      wipLimit: null,
      isOptimistic: true,
    };
    set((s) => ({ lists: [...s.lists, optimisticList] }));

    try {
      const { data } = await api.post(`/boards/${boardId}/lists`, { title });
      // Replace temp with real
      set((s) => ({
        lists: s.lists.map((l) => (l._id === tempId ? { ...data.list, cards: [] } : l)),
      }));
      return { success: true, list: data.list };
    } catch (err) {
      // Rollback
      set((s) => ({ lists: s.lists.filter((l) => l._id !== tempId) }));
      return { success: false, message: err.response?.data?.message };
    }
  },

  updateList: async (boardId, listId, updates) => {
    // Optimistic
    const prev = get().lists.find((l) => l._id === listId);
    set((s) => ({
      lists: s.lists.map((l) => (l._id === listId ? { ...l, ...updates } : l)),
    }));

    try {
      const { data } = await api.patch(`/boards/${boardId}/lists/${listId}`, updates);
      set((s) => ({
        lists: s.lists.map((l) =>
          l._id === listId ? { ...data.list, cards: l.cards } : l
        ),
      }));
      return { success: true };
    } catch (err) {
      // Rollback
      set((s) => ({
        lists: s.lists.map((l) => (l._id === listId ? { ...l, ...prev } : l)),
      }));
      return { success: false, message: err.response?.data?.message };
    }
  },

  deleteList: async (boardId, listId) => {
    const snapshot = get().lists;
    set((s) => ({ lists: s.lists.filter((l) => l._id !== listId) }));

    try {
      await api.delete(`/boards/${boardId}/lists/${listId}`);
      return { success: true };
    } catch (err) {
      set({ lists: snapshot });
      return { success: false, message: err.response?.data?.message };
    }
  },

  reorderLists: async (boardId, newOrderedLists) => {
    // Apply immediately
    const prevLists = get().lists;
    set({ lists: newOrderedLists });

    try {
      await api.patch(`/boards/${boardId}/lists/reorder`, {
        orderedIds: newOrderedLists.map((l) => l._id),
      });
      return { success: true };
    } catch (err) {
      set({ lists: prevLists });
      return { success: false };
    }
  },

  // ─── Card operations ──────────────────────────────────────────────────────────

  createCard: async (boardId, listId, cardData) => {
    const tempId = `temp-card-${Date.now()}`;
    const optimisticCard = {
      _id: tempId,
      title: cardData.title,
      description: "",
      priority: "none",
      position: 0,
      assignees: [],
      labels: [],
      dueDate: null,
      isOptimistic: true,
      ...cardData,
    };

    set((s) => ({
      lists: s.lists.map((l) =>
        l._id === listId
          ? { ...l, cards: [...(l.cards || []), optimisticCard] }
          : l
      ),
    }));

    try {
      const { data } = await api.post(
        `/boards/${boardId}/cards/lists/${listId}/cards`,
        cardData
      );
      set((s) => ({
        lists: s.lists.map((l) =>
          l._id === listId
            ? { ...l, cards: l.cards.map((c) => (c._id === tempId ? data.card : c)) }
            : l
        ),
      }));
      return { success: true, card: data.card };
    } catch (err) {
      set((s) => ({
        lists: s.lists.map((l) =>
          l._id === listId
            ? { ...l, cards: l.cards.filter((c) => c._id !== tempId) }
            : l
        ),
      }));
      return { success: false, message: err.response?.data?.message };
    }
  },

  updateCard: async (boardId, listId, cardId, updates) => {
    const prevLists = get().lists;
    // Optimistic
    set((s) => ({
      lists: s.lists.map((l) =>
        l._id === listId
          ? { ...l, cards: l.cards.map((c) => (c._id === cardId ? { ...c, ...updates } : c)) }
          : l
      ),
    }));

    try {
      const { data } = await api.patch(
        `/boards/${boardId}/cards/lists/${listId}/cards/${cardId}`,
        updates
      );
      set((s) => ({
        lists: s.lists.map((l) =>
          l._id === listId
            ? { ...l, cards: l.cards.map((c) => (c._id === cardId ? data.card : c)) }
            : l
        ),
      }));
      return { success: true, card: data.card };
    } catch (err) {
      set({ lists: prevLists });
      return { success: false, message: err.response?.data?.message };
    }
  },

  deleteCard: async (boardId, listId, cardId) => {
    const snapshot = get().lists;
    set((s) => ({
      lists: s.lists.map((l) =>
        l._id === listId ? { ...l, cards: l.cards.filter((c) => c._id !== cardId) } : l
      ),
    }));

    try {
      await api.delete(`/boards/${boardId}/cards/lists/${listId}/cards/${cardId}`);
      return { success: true };
    } catch (err) {
      set({ lists: snapshot });
      return { success: false };
    }
  },

  /**
   * Optimistically apply a DnD move, then sync with server.
   */
  moveCard: async (boardId, { cardId, sourceListId, destinationListId, sourceIndex, destinationIndex }) => {
    const prevLists = get().lists;
    const sourceLists = get().lists;

    // Build new lists array with the card moved
    const newLists = sourceLists.map((l) => ({ ...l, cards: [...(l.cards || [])] }));
    const srcList = newLists.find((l) => l._id === sourceListId);
    const dstList = newLists.find((l) => l._id === destinationListId);
    if (!srcList || !dstList) return;

    const [movedCard] = srcList.cards.splice(sourceIndex, 1);
    dstList.cards.splice(destinationIndex, 0, movedCard);

    // Apply optimistically
    set({ lists: newLists });

    try {
      await api.patch(`/boards/${boardId}/cards/move`, {
        cardId,
        sourceListId,
        destinationListId,
        sourceIndex,
        destinationIndex,
      });
      return { success: true };
    } catch (err) {
      // Rollback on failure
      set({ lists: prevLists });
      return { success: false };
    }
  },

  // ─── Real-time socket event handler (Week 3) ─────────────────────────────
  applyServerUpdate: (event, payload) => {
    const { lists } = get();

    switch (event) {
      // ── Card events ────────────────────────────────────────────────────────
      case "card:created": {
        const { card, listId } = payload;
        set({
          lists: lists.map((l) => {
            if (l._id !== listId) return l;
            // Deduplication: skip if card already exists (e.g. from optimistic update)
            const exists = l.cards.some(
              (c) => c._id === card._id || c.isOptimistic
            );
            if (exists) {
              // Replace optimistic placeholder with real card
              return {
                ...l,
                cards: l.cards.some((c) => c.isOptimistic)
                  ? l.cards.map((c) => (c.isOptimistic ? card : c))
                  : l.cards,
              };
            }
            return { ...l, cards: [...l.cards, card] };
          }),
        });
        break;
      }

      case "card:updated": {
        const { card } = payload;
        set({
          lists: lists.map((l) => ({
            ...l,
            cards: l.cards.map((c) =>
              c._id === card._id ? { ...c, ...card } : c
            ),
          })),
        });
        break;
      }

      case "card:moved": {
        const { card, sourceListId, destinationListId, destinationIndex } = payload;
        const newLists = lists.map((l) => ({ ...l, cards: [...(l.cards || [])] }));
        const src = newLists.find((l) => l._id === sourceListId);
        const dst = newLists.find((l) => l._id === destinationListId);

        if (src && dst) {
          // Remove from source
          const srcIdx = src.cards.findIndex((c) => c._id === card._id);
          if (srcIdx !== -1) src.cards.splice(srcIdx, 1);

          // Patch and insert at destination
          const dstIdx = dst.cards.findIndex((c) => c._id === card._id);
          if (dstIdx !== -1) dst.cards.splice(dstIdx, 1);
          dst.cards.splice(destinationIndex, 0, card);

          set({ lists: newLists });
        }
        break;
      }

      case "card:archived": {
        const { cardId, listId } = payload;
        set({
          lists: lists.map((l) =>
            l._id === listId
              ? { ...l, cards: l.cards.filter((c) => c._id !== cardId) }
              : l
          ),
        });
        break;
      }

      case "cards:reordered": {
        const { listId, orderedIds } = payload;
        set({
          lists: lists.map((l) => {
            if (l._id !== listId) return l;
            const cardMap = Object.fromEntries(l.cards.map((c) => [c._id, c]));
            return {
              ...l,
              cards: orderedIds.map((id) => cardMap[id]).filter(Boolean),
            };
          }),
        });
        break;
      }

      // ── Comment events ─────────────────────────────────────────────────────
      case "card:comment_added": {
        const { cardId, comment } = payload;
        set({
          lists: lists.map((l) => ({
            ...l,
            cards: l.cards.map((c) =>
              c._id === cardId
                ? { ...c, comments: [...(c.comments || []), comment] }
                : c
            ),
          })),
        });
        break;
      }

      case "card:comment_deleted": {
        const { cardId, commentId } = payload;
        set({
          lists: lists.map((l) => ({
            ...l,
            cards: l.cards.map((c) =>
              c._id === cardId
                ? {
                    ...c,
                    comments: (c.comments || []).filter(
                      (cm) => cm._id !== commentId
                    ),
                  }
                : c
            ),
          })),
        });
        break;
      }

      // ── List events ────────────────────────────────────────────────────────
      case "list:created": {
        const { list } = payload;
        const exists = lists.some((l) => l._id === list._id);
        if (!exists) set({ lists: [...lists, { ...list, cards: [] }] });
        break;
      }

      case "list:updated": {
        const { list } = payload;
        set({
          lists: lists.map((l) =>
            l._id === list._id ? { ...l, ...list } : l
          ),
        });
        break;
      }

      case "list:deleted":
      case "list:archived": {
        const { listId } = payload;
        set({ lists: lists.filter((l) => l._id !== listId) });
        break;
      }

      case "lists:reordered": {
        const { orderedIds } = payload;
        const listMap = Object.fromEntries(lists.map((l) => [l._id, l]));
        const reordered = orderedIds.map((id) => listMap[id]).filter(Boolean);
        set({ lists: reordered });
        break;
      }

      default:
        break;
    }
  },

  reset: () => set({ board: null, lists: [], isLoading: false, error: null }),
}));

export default useBoardStore;
