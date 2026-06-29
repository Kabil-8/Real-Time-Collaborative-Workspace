/**
 * socket/emitters/cardEmitter.js
 *
 * Centralised Socket.io emitters for card-related real-time events.
 *
 * Design decisions:
 *   - All emitters accept `app` (the Express application) and derive `io`
 *     from `app.get("io")` — the instance that was attached during initSocket().
 *   - Emitters are fire-and-forget from the controller's perspective; any
 *     error is caught and logged here so it never bubbles up into the HTTP
 *     response lifecycle.
 *   - We emit to the full room (io.to) rather than socket.to so that the
 *     originating user's *other* open tabs also receive the update.
 *     The frontend deduplicates via card._id to avoid double-rendering.
 *
 * Events emitted:
 *   card:created  — Day 3  (this file)
 *   card:updated  — Day 4  (stub present, implemented tomorrow)
 *   card:moved    — Day 5  (stub present, implemented day after)
 *
 * Room naming convention:  "board:<boardId>"
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
 *
 * @param {string} boardId
 * @returns {string}  e.g. "board:64f1a2b3c4d5e6f7a8b9c0d1"
 */
const getBoardRoom = (boardId) => `board:${boardId}`;

// ─── Day 3: card:created ──────────────────────────────────────────────────────

/**
 * Broadcast a newly created card to every socket in the board room.
 *
 * Called by: cardController.createCard — immediately after successResponse().
 *
 * Payload shape received by the frontend:
 * {
 *   boardId : string,          // which board the card belongs to
 *   card    : {                // the fully populated card document
 *     _id        : string,
 *     title      : string,
 *     description: string,
 *     list       : string,     // listId
 *     board      : string,     // boardId
 *     position   : number,
 *     priority   : string,
 *     dueDate    : string | null,
 *     coverColor : string | null,
 *     assignees  : Array<{ _id, name, avatar, avatarColor }>,
 *     labels     : string[],
 *     createdAt  : string,
 *     updatedAt  : string,
 *   }
 * }
 *
 * @param {import("express").Application} app
 * @param {string} boardId
 * @param {object} card  - The populated Mongoose card document (plain object or doc)
 */
const emitCardCreated = (app, boardId, card) => {
  try {
    const io = getIO(app);
    if (!io) return;

    const roomKey = getBoardRoom(boardId);

    io.to(roomKey).emit("card:created", {
      boardId,
      card,
    });

    console.log(
      `[CardEmitter] 📤 card:created → ${roomKey} | card="${card.title}" (${card._id})`
    );
  } catch (err) {
    // Never let a socket error crash the HTTP response cycle
    console.error("[CardEmitter] ❌ Failed to emit card:created:", err.message);
  }
};

// ─── Day 4: card:updated (stub — implemented tomorrow) ───────────────────────

/**
 * Broadcast a card update to all sockets in the board room.
 *
 * Payload:
 * {
 *   boardId : string,
 *   card    : { _id, title, description, priority, dueDate, coverColor,
 *               assignees, labels, updatedAt }
 * }
 *
 * @param {import("express").Application} app
 * @param {string} boardId
 * @param {object} card
 */
const emitCardUpdated = (app, boardId, card) => {
  try {
    const io = getIO(app);
    if (!io) return;

    const roomKey = getBoardRoom(boardId);

    io.to(roomKey).emit("card:updated", {
      boardId,
      card,
    });

    console.log(
      `[CardEmitter] 📤 card:updated → ${roomKey} | card="${card.title}" (${card._id})`
    );
  } catch (err) {
    console.error("[CardEmitter] ❌ Failed to emit card:updated:", err.message);
  }
};

// ─── Day 5: card:moved (stub — implemented day after tomorrow) ───────────────

/**
 * Broadcast a card move to all sockets in the board room.
 *
 * Payload:
 * {
 *   boardId      : string,
 *   cardId       : string,
 *   sourceListId : string,
 *   destListId   : string,
 *   newPosition  : number,
 *   card         : { _id, list, position, updatedAt }
 * }
 *
 * @param {import("express").Application} app
 * @param {string} boardId
 * @param {object} payload  - { cardId, sourceListId, destListId, newPosition, card }
 */
const emitCardMoved = (app, boardId, payload) => {
  try {
    const io = getIO(app);
    if (!io) return;

    const roomKey = getBoardRoom(boardId);

    io.to(roomKey).emit("card:moved", {
      boardId,
      ...payload,
    });

    console.log(
      `[CardEmitter] 📤 card:moved → ${roomKey} | card=${payload.cardId} | ${payload.sourceListId} → ${payload.destListId}`
    );
  } catch (err) {
    console.error("[CardEmitter] ❌ Failed to emit card:moved:", err.message);
  }
};

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  emitCardCreated,
  emitCardUpdated, // Day 4
  emitCardMoved,   // Day 5
};
