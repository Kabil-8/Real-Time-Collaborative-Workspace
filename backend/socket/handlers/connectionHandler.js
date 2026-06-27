/**
 * socket/handlers/connectionHandler.js
 *
 * Registers all per-socket event handlers for connection and disconnection.
 *
 * Events handled:
 *   Connection  (implicit — called once per socket by index.js)
 *   join_board  → socket joins a board room; other members are notified
 *   leave_board → socket leaves a board room; other members are notified
 *   ping        → keepalive / latency measurement
 *   disconnect  → cleanup and room broadcast
 *
 * Presence events emitted TO THE ROOM:
 *   user:joined   { user, onlineCount }   — when a new user enters a room
 *   user:left     { userId, onlineCount } — when a user fully leaves a room
 *
 * Presence events emitted TO THE SOCKET (self):
 *   room:state    { boardId, onlineUsers } — snapshot on join
 *   pong          { timestamp }           — response to ping
 */

const presenceManager = require("../presenceManager");
const Board = require("../../models/Board");

// ─── Helper: safe board ID validation ────────────────────────────────────────

/**
 * Validates that boardId is a non-empty string.
 * Does NOT hit the database — that happens only in join_board.
 */
const isValidId = (id) =>
  typeof id === "string" && id.trim().length > 0;

// ─── Connection handler ───────────────────────────────────────────────────────

/**
 * Called once for every successfully authenticated socket.
 *
 * @param {import("socket.io").Server} io
 * @param {import("socket.io").Socket} socket
 */
const handleConnection = (io, socket) => {
  const { user } = socket; // populated by socketAuthMiddleware

  // Register in presence map
  presenceManager.addSocket(socket.id, user);

  console.log(
    `[Socket] ✅ Connected  | id=${socket.id} | user=${user.name} (${user._id})`
  );

  // ─── join_board ─────────────────────────────────────────────────────────────
  /**
   * Client emits:  socket.emit("join_board", { boardId })
   *
   * Server:
   *   1. Validates boardId
   *   2. Checks DB that the user is actually a board member (authorization)
   *   3. Joins the socket.io room "board:<boardId>"
   *   4. Updates presence
   *   5. Emits room:state back to the joiner
   *   6. Broadcasts user:joined to other members in the room
   */
  socket.on("join_board", async (payload) => {
    try {
      const boardId = payload?.boardId;

      if (!isValidId(boardId)) {
        return socket.emit("error", {
          code: "INVALID_PAYLOAD",
          message: "join_board requires a valid boardId.",
        });
      }

      const roomKey = `board:${boardId}`;

      // ── Authorization check ─────────────────────────────────────────────────
      // Prevents unauthorized users from joining a room simply by emitting
      // the event with a guessed boardId.
      const board = await Board.findById(boardId).select("members isArchived title");

      if (!board || board.isArchived) {
        return socket.emit("error", {
          code: "BOARD_NOT_FOUND",
          message: "Board not found or has been archived.",
        });
      }

      const isMember = board.members.some(
        (m) => m.user.toString() === user._id
      );
      if (!isMember) {
        return socket.emit("error", {
          code: "ACCESS_DENIED",
          message: "You are not a member of this board.",
        });
      }

      // ── Join socket.io room ─────────────────────────────────────────────────
      socket.join(roomKey);

      // ── Update presence ─────────────────────────────────────────────────────
      const isFirstSocket = presenceManager.joinRoom(socket.id, roomKey);

      // Count distinct online users in this room
      const onlineUserIds = presenceManager.getRoomUserIds(roomKey);

      // ── Emit room state snapshot back to joiner ─────────────────────────────
      socket.emit("room:state", {
        boardId,
        onlineUserIds,
        onlineCount: onlineUserIds.length,
      });

      // ── Broadcast to others only if this is the user's first socket in room ─
      if (isFirstSocket) {
        socket.to(roomKey).emit("user:joined", {
          user: {
            _id: user._id,
            name: user.name,
            avatar: user.avatar,
            avatarColor: user.avatarColor,
          },
          onlineCount: onlineUserIds.length,
        });
      }

      console.log(
        `[Socket] 🚪 join_board | room=${roomKey} | user=${user.name} | online=${onlineUserIds.length}`
      );
    } catch (err) {
      console.error(`[Socket] ❌ join_board error for socket ${socket.id}:`, err.message);
      socket.emit("error", {
        code: "SERVER_ERROR",
        message: "Failed to join board room.",
      });
    }
  });

  // ─── leave_board ────────────────────────────────────────────────────────────
  /**
   * Client emits:  socket.emit("leave_board", { boardId })
   *
   * Safe to call multiple times — idempotent.
   */
  socket.on("leave_board", (payload) => {
    try {
      const boardId = payload?.boardId;

      if (!isValidId(boardId)) return;

      const roomKey = `board:${boardId}`;

      socket.leave(roomKey);
      const userFullyLeft = presenceManager.leaveRoom(socket.id, roomKey);

      if (userFullyLeft) {
        const onlineUserIds = presenceManager.getRoomUserIds(roomKey);
        socket.to(roomKey).emit("user:left", {
          userId: user._id,
          onlineCount: onlineUserIds.length,
        });

        console.log(
          `[Socket] 🚪 leave_board | room=${roomKey} | user=${user.name} | online=${onlineUserIds.length}`
        );
      }
    } catch (err) {
      console.error(`[Socket] ❌ leave_board error for socket ${socket.id}:`, err.message);
    }
  });

  // ─── ping / pong (keepalive + latency) ──────────────────────────────────────
  /**
   * Client emits:  socket.emit("ping", { timestamp: Date.now() })
   * Server replies: socket.emit("pong", { timestamp, serverTime })
   */
  socket.on("ping", (payload) => {
    socket.emit("pong", {
      timestamp: payload?.timestamp ?? null,
      serverTime: Date.now(),
    });
  });

  // ─── disconnect ─────────────────────────────────────────────────────────────
  /**
   * Socket.io fires this automatically; we handle cleanup here.
   *
   * reason — a string describing why the socket disconnected, e.g.
   *   "transport close" (tab closed / network drop)
   *   "server namespace disconnect" (server called socket.disconnect())
   *   "ping timeout"
   */
  socket.on("disconnect", (reason) => {
    try {
      const removed = presenceManager.removeSocket(socket.id);

      if (!removed) {
        // Socket was not found in presence map — already cleaned up
        console.warn(
          `[Socket] ⚠️  disconnect: socket ${socket.id} not found in presence map`
        );
        return;
      }

      const { userId, vacatedRooms } = removed;

      console.log(
        `[Socket] ❌ Disconnected | id=${socket.id} | user=${user.name} (${userId}) | reason=${reason}`
      );

      // Notify every room the user fully vacated
      for (const roomKey of vacatedRooms) {
        const onlineUserIds = presenceManager.getRoomUserIds(roomKey);

        io.to(roomKey).emit("user:left", {
          userId,
          onlineCount: onlineUserIds.length,
        });

        console.log(
          `[Socket]    └─ user:left emitted to ${roomKey} | online=${onlineUserIds.length}`
        );
      }
    } catch (err) {
      // Never throw from disconnect — just log
      console.error(
        `[Socket] ❌ Error in disconnect handler for ${socket.id}:`,
        err.message
      );
    }
  });
};

module.exports = { handleConnection };
