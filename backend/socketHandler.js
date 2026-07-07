const { verifyToken } = require("./utils/jwt");
const User = require("./models/User");

// ─── In-memory presence store ────────────────────────────────────────────────
// boardPresence: Map<boardId, Map<socketId, { userId, name, avatarColor }>>
const boardPresence = new Map();

// ─── Helper: get presence list for a board ───────────────────────────────────
const getPresenceList = (boardId) => {
  const room = boardPresence.get(boardId);
  if (!room) return [];
  return Array.from(room.values());
};

// ─── Helper: deduplicate by userId (keep latest socket) ─────────────────────
const getUniquePresence = (boardId) => {
  const list = getPresenceList(boardId);
  const seen = new Map();
  list.forEach((u) => seen.set(u.userId, u));
  return Array.from(seen.values());
};

// ─── initSocket ───────────────────────────────────────────────────────────────
const initSocket = (io) => {
  // ── Auth middleware ────────────────────────────────────────────────────────
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace("Bearer ", "");

      if (!token) {
        return next(new Error("Authentication required"));
      }

      const decoded = verifyToken(token);
      if (!decoded) {
        return next(new Error("Invalid or expired token"));
      }

      const user = await User.findById(decoded.id).select(
        "name email avatarColor avatar"
      );
      if (!user) {
        return next(new Error("User not found"));
      }

      // Attach user to socket for later use
      socket.user = {
        userId: user._id.toString(),
        name: user.name,
        avatarColor: user.avatarColor || "#8b5cf6",
        avatar: user.avatar || null,
      };

      next();
    } catch (err) {
      next(new Error("Authentication error"));
    }
  });

  // ── Connection handler ────────────────────────────────────────────────────
  io.on("connection", (socket) => {
    const { user } = socket;
    console.log(`🔌 Socket connected: ${socket.id} (${user.name})`);

    // Track which boards this socket has joined
    socket.joinedBoards = new Set();

    // ── Personal user room — for notifications, DMs, etc. ──────────────────
    // Each authenticated user joins their own room immediately on connect.
    // Notification emits use: io.to(`user:${userId}`).emit("notify:new", ...)
    socket.join(`user:${user.userId}`);

    // ── join_board ───────────────────────────────────────────────────────────
    socket.on("join_board", ({ boardId }) => {
      if (!boardId) return;

      const roomName = `board:${boardId}`;
      socket.join(roomName);
      socket.joinedBoards.add(boardId);

      // Update presence map
      if (!boardPresence.has(boardId)) {
        boardPresence.set(boardId, new Map());
      }
      boardPresence.get(boardId).set(socket.id, {
        ...user,
        socketId: socket.id,
      });

      // Broadcast updated presence to all in room
      const presence = getUniquePresence(boardId);
      io.to(roomName).emit("presence:update", { boardId, users: presence });

      console.log(`  └─ ${user.name} joined board:${boardId}`);
    });

    // ── leave_board ──────────────────────────────────────────────────────────
    socket.on("leave_board", ({ boardId }) => {
      if (!boardId) return;
      _leaveBoard(socket, boardId, io);
    });

    // ── typing:start ─────────────────────────────────────────────────────────
    socket.on("typing:start", ({ boardId, context }) => {
      if (!boardId) return;
      socket
        .to(`board:${boardId}`)
        .emit("user:typing", {
          user,
          boardId,
          context: context || "board", // "board" | "card:<cardId>"
          isTyping: true,
        });
    });

    // ── typing:stop ──────────────────────────────────────────────────────────
    socket.on("typing:stop", ({ boardId, context }) => {
      if (!boardId) return;
      socket
        .to(`board:${boardId}`)
        .emit("user:typing", {
          user,
          boardId,
          context: context || "board",
          isTyping: false,
        });
    });

    // ── disconnect ───────────────────────────────────────────────────────────
    socket.on("disconnect", (reason) => {
      console.log(
        `🔌 Socket disconnected: ${socket.id} (${user.name}) — ${reason}`
      );

      // Clean up from all joined boards
      socket.joinedBoards.forEach((boardId) => {
        _leaveBoard(socket, boardId, io);
      });
    });
  });
};

// ─── Internal: clean leave logic ─────────────────────────────────────────────
function _leaveBoard(socket, boardId, io) {
  const roomName = `board:${boardId}`;
  socket.leave(roomName);
  socket.joinedBoards.delete(boardId);

  // Remove from presence
  const room = boardPresence.get(boardId);
  if (room) {
    room.delete(socket.id);
    if (room.size === 0) {
      boardPresence.delete(boardId);
    }
  }

  // Broadcast updated presence
  const presence = getUniquePresence(boardId);
  io.to(roomName).emit("presence:update", { boardId, users: presence });
}

module.exports = { initSocket };
