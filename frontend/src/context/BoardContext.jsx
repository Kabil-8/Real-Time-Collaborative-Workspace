import React, { createContext, useContext, useCallback, useEffect, useState } from "react";
import api from "../utils/api";
import { getSocket } from "../utils/socket";

const BoardContext = createContext(null);

export function BoardProvider({ boardId, children }) {
  const [board, setBoard] = useState(null);
  const [lists, setLists] = useState([]);
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!boardId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/boards/${boardId}/full`);
      const d = res.data.data;
      setBoard(d.board);
      setLists(d.lists || []);
      setCards(d.cards || []);
    } catch (e) {
      setError(e.response?.data?.message || "Failed to load board");
    } finally {
      setLoading(false);
    }
  }, [boardId]);

  useEffect(() => { load(); }, [load]);

  // Real-time subscription
  useEffect(() => {
    if (!boardId) return;
    const socket = getSocket();
    const join = () => socket.emit("join-board", boardId);
    join();
    socket.on("connect", join);

    const onListCreated = ({ list }) =>
      setLists((prev) => (prev.some((l) => l._id === list._id) ? prev : [...prev, list]));
    const onListUpdated = ({ list }) =>
      setLists((prev) => prev.map((l) => (l._id === list._id ? list : l)));
    const onListDeleted = ({ listId }) => {
      setLists((prev) => prev.filter((l) => l._id !== listId));
      setCards((prev) => prev.filter((c) => c.listId !== listId));
    };
    const onCardCreated = ({ card }) =>
      setCards((prev) => (prev.some((c) => c._id === card._id) ? prev : [...prev, card]));
    const onCardUpdated = ({ card }) =>
      setCards((prev) => prev.map((c) => (c._id === card._id ? card : c)));
    const onCardMoved = ({ card }) =>
      setCards((prev) => prev.map((c) => (c._id === card._id ? card : c)));
    const onCardDeleted = ({ cardId }) =>
      setCards((prev) => prev.filter((c) => c._id !== cardId));
    const onReload = () => load();

    socket.on("list:created", onListCreated);
    socket.on("list:updated", onListUpdated);
    socket.on("list:deleted", onListDeleted);
    socket.on("card:created", onCardCreated);
    socket.on("card:updated", onCardUpdated);
    socket.on("card:moved", onCardMoved);
    socket.on("card:deleted", onCardDeleted);
    socket.on("board:reload", onReload);

    return () => {
      socket.emit("leave-board", boardId);
      socket.off("connect", join);
      socket.off("list:created", onListCreated);
      socket.off("list:updated", onListUpdated);
      socket.off("list:deleted", onListDeleted);
      socket.off("card:created", onCardCreated);
      socket.off("card:updated", onCardUpdated);
      socket.off("card:moved", onCardMoved);
      socket.off("card:deleted", onCardDeleted);
      socket.off("board:reload", onReload);
    };
  }, [boardId, load]);

  const createList = useCallback(async (title) => {
    const res = await api.post("/boards/lists", { boardId, title });
    setLists((prev) => [...prev, res.data.data.list]);
  }, [boardId]);

  const updateList = useCallback(async (listId, patch) => {
    const res = await api.patch(`/boards/lists/${listId}`, patch);
    setLists((prev) => prev.map((l) => (l._id === listId ? res.data.data.list : l)));
  }, []);

  const deleteList = useCallback(async (listId) => {
    await api.delete(`/boards/lists/${listId}`);
    setLists((prev) => prev.filter((l) => l._id !== listId));
    setCards((prev) => prev.filter((c) => c.listId !== listId));
  }, []);

  const createCard = useCallback(async (listId, title) => {
    const res = await api.post("/boards/cards", { listId, title });
    setCards((prev) => [...prev, res.data.data.card]);
  }, []);

  const updateCard = useCallback(async (cardId, patch) => {
    const res = await api.patch(`/boards/cards/${cardId}`, patch);
    setCards((prev) => prev.map((c) => (c._id === cardId ? res.data.data.card : c)));
  }, []);

  const deleteCard = useCallback(async (cardId) => {
    await api.delete(`/boards/cards/${cardId}`);
    setCards((prev) => prev.filter((c) => c._id !== cardId));
  }, []);

  const moveCard = useCallback(async (cardId, targetListId, newIndex) => {
    // optimistic reorder
    setCards((prev) => {
      const moving = prev.find((c) => c._id === cardId);
      if (!moving) return prev;
      const others = prev.filter((c) => c._id !== cardId);
      const targetSiblings = others
        .filter((c) => c.listId === targetListId)
        .sort((a, b) => a.order - b.order);
      const before = targetSiblings.slice(0, newIndex);
      const after = targetSiblings.slice(newIndex);
      const rebuilt = [
        ...others.filter((c) => c.listId !== targetListId),
        ...before,
        { ...moving, listId: targetListId },
        ...after,
      ];
      return rebuilt;
    });
    try {
      const res = await api.patch(`/boards/cards/${cardId}/move`, { targetListId, newIndex });
      const updated = res.data.data.card;
      setCards((prev) => prev.map((c) => (c._id === cardId ? updated : c)));
    } catch {
      // reload on failure
      load();
    }
  }, [load]);

  return (
    <BoardContext.Provider
      value={{
        board, lists, cards, loading, error, reload: load,
        createList, updateList, deleteList,
        createCard, updateCard, deleteCard, moveCard,
      }}
    >
      {children}
    </BoardContext.Provider>
  );
}

export function useBoard() {
  const ctx = useContext(BoardContext);
  if (!ctx) throw new Error("useBoard must be used within BoardProvider");
  return ctx;
}