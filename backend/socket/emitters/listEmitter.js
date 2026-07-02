/**
 * socket/emitters/listEmitter.js
 *
 * Centralised Socket.io emitters for list-related real-time events.
 *
 * Design decisions:
 *   - Mirror pattern from cardEmitter: fire-and-forget, errors caught here.
 *   - Each event carries `originSocketId` so the frontend can skip
 *     events it already applied optimistically.
 *   - Room naming: "board:<boardId>"
 *
 * Events emitted:
 *   list:created    — new list added to a board
 *   list:updated    — list title / color / wipLimit changed
 *   list:archived   — list soft-deleted (with all its cards)
 *   list:restored   — archived list restored
 *   list:duplicated — list cloned with copied cards
 *   list:reordered  — lists reordered (drag-and-drop)
 */

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getIO = (app) => {
  const io = app?.get("io");
  if (!io) {
    console.warn("[ListEmitter] ⚠️  io not found on app — socket not initialised yet?");
    return null;
  }
  return io;
};

const getBoardRoom = (boardId) => `board:${boardId}`;

// ─── list:created ─────────────────────────────────────────────────────────────

/**
 * Broadcast a newly created list to every socket in the board room.
 *
 * Payload received by frontend:
 * { boardId, list: { _id, title, board, position, color, wipLimit,
 *                    cardOrder: [] }, originSocketId }
 *
 * @param {import("express").Application} app
 * @param {string} boardId
 * @param {object} list
 * @param {string} [originSocketId]
 */
const emitListCreated = (app, boardId, list, originSocketId) => {
  try {
    const io = getIO(app);
    if (!io) return;

    const roomKey = getBoardRoom(boardId);

    io.to(roomKey).emit("list:created", {
      boardId,
      list,
      originSocketId: originSocketId || null,
    });

    console.log(
      `[ListEmitter] 📤 list:created → ${roomKey} | list="${list.title}" (${list._id})`
    );
  } catch (err) {
    console.error("[ListEmitter] ❌ Failed to emit list:created:", err.message);
  }
};

// ─── list:updated ─────────────────────────────────────────────────────────────

/**
 * Broadcast a list update (title / color / wipLimit) to the board room.
 *
 * Payload: { boardId, list: { _id, title, color, wipLimit, ... }, originSocketId }
 *
 * @param {import("express").Application} app
 * @param {string} boardId
 * @param {object} list
 * @param {string} [originSocketId]
 */
const emitListUpdated = (app, boardId, list, originSocketId) => {
  try {
    const io = getIO(app);
    if (!io) return;

    const roomKey = getBoardRoom(boardId);

    io.to(roomKey).emit("list:updated", {
      boardId,
      list,
      originSocketId: originSocketId || null,
    });

    console.log(
      `[ListEmitter] 📤 list:updated → ${roomKey} | list="${list.title}" (${list._id})`
    );
  } catch (err) {
    console.error("[ListEmitter] ❌ Failed to emit list:updated:", err.message);
  }
};

// ─── list:archived ────────────────────────────────────────────────────────────

/**
 * Broadcast a list archive (soft-delete) to all sockets in the board room.
 *
 * Payload: { boardId, listId, originSocketId }
 *
 * @param {import("express").Application} app
 * @param {string} boardId
 * @param {string} listId
 * @param {string} [originSocketId]
 */
const emitListArchived = (app, boardId, listId, originSocketId) => {
  try {
    const io = getIO(app);
    if (!io) return;

    const roomKey = getBoardRoom(boardId);

    io.to(roomKey).emit("list:archived", {
      boardId,
      listId,
      originSocketId: originSocketId || null,
    });

    console.log(
      `[ListEmitter] 📤 list:archived → ${roomKey} | list=${listId}`
    );
  } catch (err) {
    console.error("[ListEmitter] ❌ Failed to emit list:archived:", err.message);
  }
};

// ─── list:restored ────────────────────────────────────────────────────────────

/**
 * Broadcast a list restore to all sockets in the board room.
 * The full populated list (with cards) is sent so receivers can insert it.
 *
 * Payload: { boardId, list: { _id, title, cardOrder, ... }, originSocketId }
 *
 * @param {import("express").Application} app
 * @param {string} boardId
 * @param {object} list  - populated list document
 * @param {string} [originSocketId]
 */
const emitListRestored = (app, boardId, list, originSocketId) => {
  try {
    const io = getIO(app);
    if (!io) return;

    const roomKey = getBoardRoom(boardId);

    io.to(roomKey).emit("list:restored", {
      boardId,
      list,
      originSocketId: originSocketId || null,
    });

    console.log(
      `[ListEmitter] 📤 list:restored → ${roomKey} | list="${list.title}" (${list._id})`
    );
  } catch (err) {
    console.error("[ListEmitter] ❌ Failed to emit list:restored:", err.message);
  }
};

// ─── list:duplicated ──────────────────────────────────────────────────────────

/**
 * Broadcast a duplicated list (with copied cards) to all sockets in the room.
 *
 * Payload: { boardId, list: { _id, title, cardOrder, ... }, originSocketId }
 *
 * @param {import("express").Application} app
 * @param {string} boardId
 * @param {object} list  - the new populated list
 * @param {string} [originSocketId]
 */
const emitListDuplicated = (app, boardId, list, originSocketId) => {
  try {
    const io = getIO(app);
    if (!io) return;

    const roomKey = getBoardRoom(boardId);

    io.to(roomKey).emit("list:duplicated", {
      boardId,
      list,
      originSocketId: originSocketId || null,
    });

    console.log(
      `[ListEmitter] 📤 list:duplicated → ${roomKey} | list="${list.title}" (${list._id})`
    );
  } catch (err) {
    console.error("[ListEmitter] ❌ Failed to emit list:duplicated:", err.message);
  }
};

// ─── list:reordered ───────────────────────────────────────────────────────────

/**
 * Broadcast a list reorder (drag-and-drop) to all sockets in the board room.
 *
 * Payload:
 * { boardId, listId, fromIndex, toIndex, originSocketId }
 *
 * Receivers apply the same splice operation to their local state.
 *
 * @param {import("express").Application} app
 * @param {string} boardId
 * @param {string} listId
 * @param {number} fromIndex
 * @param {number} toIndex
 * @param {string} [originSocketId]
 */
const emitListReordered = (app, boardId, listId, fromIndex, toIndex, originSocketId) => {
  try {
    const io = getIO(app);
    if (!io) return;

    const roomKey = getBoardRoom(boardId);

    io.to(roomKey).emit("list:reordered", {
      boardId,
      listId,
      fromIndex,
      toIndex,
      originSocketId: originSocketId || null,
    });

    console.log(
      `[ListEmitter] 📤 list:reordered → ${roomKey} | list=${listId} | ${fromIndex} → ${toIndex}`
    );
  } catch (err) {
    console.error("[ListEmitter] ❌ Failed to emit list:reordered:", err.message);
  }
};

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  emitListCreated,
  emitListUpdated,
  emitListArchived,
  emitListRestored,
  emitListDuplicated,
  emitListReordered,
};
