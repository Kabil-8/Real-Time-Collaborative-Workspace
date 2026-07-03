/**
 * hooks/useTypingIndicator.js
 * ─────────────────────────────────────────────────────────────────
 * Manages real-time typing indicators for the board.
 *
 * Responsibilities:
 *   1. Listen to `typing:start` / `typing:stop` from the socket.
 *   2. Maintain a local Map of active typists keyed by a composite
 *      contextKey (e.g. "list_add_card:listId" or "card_title:cardId").
 *   3. Auto-clear a remote typist after AUTO_CLEAR_MS of silence
 *      (guards against a missed typing:stop, e.g. tab crash).
 *   4. Expose emitTyping() and emitStopTyping() for components to call.
 *      emitTyping() is debounced: repeated calls reset a 3 s auto-stop timer.
 *
 * Usage (from BoardContext / components):
 *   const { typists, emitTyping, emitStopTyping } = useTypingIndicator(socket, boardId);
 *
 *   // Emit while typing
 *   onChange={e => { setValue(e.target.value); emitTyping("list_add_card", list._id); }}
 *
 *   // Read who's typing in a specific context
 *   const activeTypists = getTypistsFor("list_add_card", list._id);
 */

import { useCallback, useEffect, useRef, useState } from "react";

/** Auto-clear a remote typist if no new typing:start arrives within this window. */
const AUTO_CLEAR_MS = 5000;
/** Debounce delay before sending typing:stop after the last keystroke. */
const STOP_DEBOUNCE_MS = 3000;

/**
 * Build a stable string key for a typing context.
 * @param {string} context
 * @param {string|null} [listId]
 * @param {string|null} [cardId]
 * @returns {string}
 */
const makeKey = (context, listId = null, cardId = null) =>
  `${context}:${listId || ""}:${cardId || ""}`;

/**
 * @param {import("socket.io-client").Socket | null} socket
 * @param {string | null | undefined} boardId
 * @returns {{
 *   typists: Map<string, { userId: string, name: string, avatarColor: string }[]>,
 *   emitTyping: (context: string, listId?: string|null, cardId?: string|null) => void,
 *   emitStopTyping: (context: string, listId?: string|null, cardId?: string|null) => void,
 *   getTypistsFor: (context: string, listId?: string|null, cardId?: string|null) => { userId: string, name: string, avatarColor: string }[],
 * }}
 */
const useTypingIndicator = (socket, boardId) => {
  /**
   * typists: Map<contextKey, Map<userId, { name, avatarColor, clearTimer }>>
   * We use a nested Map so that multiple users can type in the same context
   * and each clears independently.
   */
  const typistDataRef = useRef(new Map()); // Map<key, Map<userId, { name, avatarColor, clearTimer }>>

  // Serialised view for React re-renders: Map<key, Array<{ userId, name, avatarColor }>>
  const [typists, setTypists] = useState(new Map());

  // Per-context debounce timers for the LOCAL user's own auto-stop emissions
  const localStopTimers = useRef(new Map()); // Map<contextKey, timeoutId>

  // ── Helpers ────────────────────────────────────────────────────────────────

  /** Flush typistDataRef → typists state (React-safe snapshot). */
  const flush = useCallback(() => {
    const snapshot = new Map();
    for (const [key, userMap] of typistDataRef.current) {
      const arr = [...userMap.values()].map(({ name, avatarColor, userId }) => ({
        userId, name, avatarColor,
      }));
      if (arr.length > 0) snapshot.set(key, arr);
    }
    setTypists(snapshot);
  }, []);

  /**
   * Add a remote typist (or refresh their auto-clear timer).
   */
  const addTypist = useCallback((key, userId, name, avatarColor) => {
    const dataMap = typistDataRef.current;
    if (!dataMap.has(key)) dataMap.set(key, new Map());
    const userMap = dataMap.get(key);

    // Clear existing auto-clear timer for this user if any
    const existing = userMap.get(userId);
    if (existing?.clearTimer) clearTimeout(existing.clearTimer);

    const clearTimer = setTimeout(() => {
      // Auto-evict after silence
      const um = dataMap.get(key);
      if (um) {
        um.delete(userId);
        if (um.size === 0) dataMap.delete(key);
      }
      flush();
    }, AUTO_CLEAR_MS);

    userMap.set(userId, { userId, name, avatarColor, clearTimer });
    flush();
  }, [flush]);

  /**
   * Remove a remote typist.
   */
  const removeTypist = useCallback((key, userId) => {
    const dataMap = typistDataRef.current;
    const userMap = dataMap.get(key);
    if (!userMap) return;
    const existing = userMap.get(userId);
    if (existing?.clearTimer) clearTimeout(existing.clearTimer);
    userMap.delete(userId);
    if (userMap.size === 0) dataMap.delete(key);
    flush();
  }, [flush]);

  // ── Socket listeners ────────────────────────────────────────────────────────

  useEffect(() => {
    if (!socket) return;

    const onTypingStart = ({ boardId: bid, context, listId, cardId, user }) => {
      if (bid !== boardId || !user?._id) return;
      const key = makeKey(context, listId, cardId);
      addTypist(key, user._id, user.name, user.avatarColor);
    };

    const onTypingStop = ({ boardId: bid, context, listId, cardId, userId }) => {
      if (bid !== boardId || !userId) return;
      const key = makeKey(context, listId, cardId);
      removeTypist(key, userId);
    };

    socket.on("typing:start", onTypingStart);
    socket.on("typing:stop",  onTypingStop);

    return () => {
      socket.off("typing:start", onTypingStart);
      socket.off("typing:stop",  onTypingStop);
    };
  }, [socket, boardId, addTypist, removeTypist]);

  // Cleanup all timers on unmount
  useEffect(() => {
    const dataMap = typistDataRef.current;
    return () => {
      for (const userMap of dataMap.values()) {
        for (const { clearTimer } of userMap.values()) {
          clearTimeout(clearTimer);
        }
      }
      for (const timerId of localStopTimers.current.values()) {
        clearTimeout(timerId);
      }
    };
  }, []);

  // ── Emission helpers ────────────────────────────────────────────────────────

  /**
   * Call on every keystroke in a typing-aware input.
   * Emits typing:start immediately and schedules an auto typing:stop
   * after STOP_DEBOUNCE_MS ms of silence.
   */
  const emitTyping = useCallback(
    (context, listId = null, cardId = null) => {
      if (!socket || !boardId) return;
      const key = makeKey(context, listId, cardId);

      socket.emit("typing:start", { boardId, context, listId, cardId });

      // Reset the local stop debounce
      if (localStopTimers.current.has(key)) {
        clearTimeout(localStopTimers.current.get(key));
      }
      const timerId = setTimeout(() => {
        socket.emit("typing:stop", { boardId, context, listId, cardId });
        localStopTimers.current.delete(key);
      }, STOP_DEBOUNCE_MS);
      localStopTimers.current.set(key, timerId);
    },
    [socket, boardId]
  );

  /**
   * Call on blur / form submit to immediately clear the typing indicator.
   */
  const emitStopTyping = useCallback(
    (context, listId = null, cardId = null) => {
      if (!socket || !boardId) return;
      const key = makeKey(context, listId, cardId);

      // Cancel pending auto-stop (it's now immediate)
      if (localStopTimers.current.has(key)) {
        clearTimeout(localStopTimers.current.get(key));
        localStopTimers.current.delete(key);
      }
      socket.emit("typing:stop", { boardId, context, listId, cardId });
    },
    [socket, boardId]
  );

  /**
   * Convenience selector used by components.
   * @returns {Array<{ userId, name, avatarColor }>}
   */
  const getTypistsFor = useCallback(
    (context, listId = null, cardId = null) => {
      const key = makeKey(context, listId, cardId);
      return typists.get(key) || [];
    },
    [typists]
  );

  return { typists, emitTyping, emitStopTyping, getTypistsFor };
};

export default useTypingIndicator;
