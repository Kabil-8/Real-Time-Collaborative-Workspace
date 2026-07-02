/**
 * socket/emitters/cardEmitter.js
 *
 * Centralised Socket.io emitters for card-related real-time events.
 *
 * Design decisions:
 *   - All emitters accept `app` (the Express application) and derive `io`
 *     from `app.get("io")` — the instance attached during initSocket().
 *   - Emitters are fire-and-forget; errors are caught here so they never
 *     bubble up into the HTTP response lifecycle.
 *   - We emit to the full room (io.to) so the originating user's *other*
 *     open tabs also receive the update. Each payload carries an
 *     `originSocketId` field (sourced from req.headers["x-socket-id"])
 *     so the frontend can skip its own optimistic-already-applied events.
 *   - Room naming convention: "board:<boardId>"
 *
 * Events emitted:
 *   card:created    — new card added to a list
 *   card:updated    — card fields changed
 *   card:moved      — card repositioned / cross-list move
 *   card:archived   — card soft-deleted
 *   card:restored   — archived card brought back
 *   card:duplicated — card cloned at end of its list
 */

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Safely retrieve the Socket.io Server instance from the Express app.
 * Returns null (and logs a warning) if it hasn't been attached yet.
 *
 * @param {import("express").Application} app
 * @returns {import("socket.io").Server | null}
 */
const getIO = (app) => {
  const io = app?.get("io");
  if (!io) {
    console.warn("[CardEmitter] ⚠️  io not found on app — socket not initialised yet?");
    return null;
  }
  return io;
};

/**
 * Build the canonical room key for a board.
 * @param {string} boardId
 * @returns {string}  e.g. "board:64f1a2b3c4d5e6f7a8b9c0d1"
 */
const getBoardRoom = (boardId) => `board:${boardId}`;

// ─── card:created ─────────────────────────────────────────────────────────────

/**
 * Broadcast a newly created card to every socket in the board room.
 *
 * Payload received by the frontend:
 * {
 *   boardId       : string,
 *   card          : { _id, title, description, list, board, position,
 *                     priority, dueDate, coverColor, assignees, labels,
 *                     createdAt, updatedAt },
 *   originSocketId: string | undefined
 * }
 *
 * @param {import("express").Application} app
 * @param {string} boardId
 * @param {object} card            - Populated Mongoose card document
 * @param {string} [originSocketId] - socket.id of the creating client (for dedup)
 */
const emitCardCreated = (app, boardId, card, originSocketId) => {
  try {
    const io = getIO(app);
    if (!io) return;

    const roomKey = getBoardRoom(boardId);

    io.to(roomKey).emit("card:created", {
      boardId,
      card,
      originSocketId: originSocketId || null,
    });

    console.log(
      `[CardEmitter] 📤 card:created → ${roomKey} | card="${card.title}" (${card._id})`
    );
  } catch (err) {
    console.error("[CardEmitter] ❌ Failed to emit card:created:", err.message);
  }
};

// ─── card:updated ─────────────────────────────────────────────────────────────

/**
 * Broadcast a card field update to all sockets in the board room.
 *
 * Payload:
 * { boardId, card: { _id, title, description, priority, dueDate,
 *                    coverColor, assignees, labels, updatedAt },
 *   originSocketId }
 *
 * @param {import("express").Application} app
 * @param {string} boardId
 * @param {object} card
 * @param {string} [originSocketId]
 */
const emitCardUpdated = (app, boardId, card, originSocketId) => {
  try {
    const io = getIO(app);
    if (!io) return;

    const roomKey = getBoardRoom(boardId);

    io.to(roomKey).emit("card:updated", {
      boardId,
      card,
      originSocketId: originSocketId || null,
    });

    console.log(
      `[CardEmitter] 📤 card:updated → ${roomKey} | card="${card.title}" (${card._id})`
    );
  } catch (err) {
    console.error("[CardEmitter] ❌ Failed to emit card:updated:", err.message);
  }
};

// ─── card:moved ───────────────────────────────────────────────────────────────

/**
 * Broadcast a card move to all sockets in the board room.
 *
 * Payload:
 * { boardId, cardId, sourceListId, destListId, newPosition,
 *   card: { _id, list, position, updatedAt }, originSocketId }
 *
 * @param {import("express").Application} app
 * @param {string} boardId
 * @param {object} payload  - { cardId, sourceListId, destListId, newPosition, card }
 * @param {string} [originSocketId]
 */
const emitCardMoved = (app, boardId, payload, originSocketId) => {
  try {
    const io = getIO(app);
    if (!io) return;

    const roomKey = getBoardRoom(boardId);

    io.to(roomKey).emit("card:moved", {
      boardId,
      ...payload,
      originSocketId: originSocketId || null,
    });

    console.log(
      `[CardEmitter] 📤 card:moved → ${roomKey} | card=${payload.cardId} | ${payload.sourceListId} → ${payload.destListId}`
    );
  } catch (err) {
    console.error("[CardEmitter] ❌ Failed to emit card:moved:", err.message);
  }
};

// ─── card:archived ────────────────────────────────────────────────────────────

/**
 * Broadcast a card archive (soft-delete) to all sockets in the board room.
 *
 * Payload:
 * { boardId, cardId, listId, originSocketId }
 *
 * @param {import("express").Application} app
 * @param {string} boardId
 * @param {string} cardId
 * @param {string} listId
 * @param {string} [originSocketId]
 */
const emitCardArchived = (app, boardId, cardId, listId, originSocketId) => {
  try {
    const io = getIO(app);
    if (!io) return;

    const roomKey = getBoardRoom(boardId);

    io.to(roomKey).emit("card:archived", {
      boardId,
      cardId,
      listId,
      originSocketId: originSocketId || null,
    });

    console.log(
      `[CardEmitter] 📤 card:archived → ${roomKey} | card=${cardId}`
    );
  } catch (err) {
    console.error("[CardEmitter] ❌ Failed to emit card:archived:", err.message);
  }
};

// ─── card:restored ────────────────────────────────────────────────────────────

/**
 * Broadcast a card restore to all sockets in the board room.
 *
 * Payload:
 * { boardId, card: { _id, title, list, position, ... }, originSocketId }
 *
 * @param {import("express").Application} app
 * @param {string} boardId
 * @param {object} card
 * @param {string} [originSocketId]
 */
const emitCardRestored = (app, boardId, card, originSocketId) => {
  try {
    const io = getIO(app);
    if (!io) return;

    const roomKey = getBoardRoom(boardId);

    io.to(roomKey).emit("card:restored", {
      boardId,
      card,
      originSocketId: originSocketId || null,
    });

    console.log(
      `[CardEmitter] 📤 card:restored → ${roomKey} | card="${card.title}" (${card._id})`
    );
  } catch (err) {
    console.error("[CardEmitter] ❌ Failed to emit card:restored:", err.message);
  }
};

// ─── card:duplicated ──────────────────────────────────────────────────────────

/**
 * Broadcast a duplicated card to all sockets in the board room.
 *
 * Payload:
 * { boardId, card: { _id, title, list, position, ... }, originSocketId }
 *
 * @param {import("express").Application} app
 * @param {string} boardId
 * @param {object} card  - the newly created duplicate card (populated)
 * @param {string} [originSocketId]
 */
const emitCardDuplicated = (app, boardId, card, originSocketId) => {
  try {
    const io = getIO(app);
    if (!io) return;

    const roomKey = getBoardRoom(boardId);

    io.to(roomKey).emit("card:duplicated", {
      boardId,
      card,
      originSocketId: originSocketId || null,
    });

    console.log(
      `[CardEmitter] 📤 card:duplicated → ${roomKey} | card="${card.title}" (${card._id})`
    );
  } catch (err) {
    console.error("[CardEmitter] ❌ Failed to emit card:duplicated:", err.message);
  }
};

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  emitCardCreated,
  emitCardUpdated,
  emitCardMoved,
  emitCardArchived,
  emitCardRestored,
  emitCardDuplicated,
};
