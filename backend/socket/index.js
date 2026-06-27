/**
 * socket/index.js
 *
 * Socket.io bootstrapper.
 *
 * Responsibilities:
 *   1. Apply the JWT authentication middleware to ALL incoming connections
 *   2. Reject unauthenticated connections before they touch any handler
 *   3. Wire the per-socket connection handler
 *   4. Attach the io instance to the Express app (for use in REST controllers)
 *   5. Expose a getStats() helper for the health-check route
 *
 * Usage (in server.js):
 *   const { initSocket } = require("./socket");
 *   initSocket(httpServer, app);
 */

const { Server } = require("socket.io");
const { socketAuthMiddleware } = require("./authMiddleware");
const { handleConnection } = require("./handlers/connectionHandler");
const presenceManager = require("./presenceManager");

/**
 * Initialize Socket.io, attach middleware and handlers, and wire io to app.
 *
 * @param {import("http").Server} httpServer
 * @param {import("express").Application} app
 * @returns {import("socket.io").Server} io
 */
const initSocket = (httpServer, app) => {
  // ─── Create the Socket.io server ──────────────────────────────────────────
  const io = new Server(httpServer, {
    // CORS — mirrors the Express CORS config
    cors: {
      origin: process.env.CLIENT_ORIGIN || "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true,
    },

    // Transport settings — WebSocket preferred; polling as fallback
    transports: ["websocket", "polling"],

    // Ping / timeout tuning (ms)
    // Clients that miss 2 consecutive pings are considered disconnected
    pingTimeout: 20000,   // how long to wait for a pong before closing
    pingInterval: 25000,  // how often to send a ping

    // Prevent clients from sending enormous payloads
    maxHttpBufferSize: 1e6, // 1 MB
  });

  // ─── Authentication middleware (runs on EVERY new connection) ─────────────
  // Any socket that fails auth is immediately rejected — no handlers fire.
  io.use(socketAuthMiddleware);

  // ─── Per-socket event wiring ──────────────────────────────────────────────
  io.on("connection", (socket) => {
    handleConnection(io, socket);
  });

  // ─── Attach io to Express app ─────────────────────────────────────────────
  // Controllers can now access: req.app.get("io") to emit events after
  // REST mutations (Week 3 real-time sync).
  app.set("io", io);

  // ─── Periodic stats logging (development only) ────────────────────────────
  if (process.env.NODE_ENV !== "production") {
    const STATS_INTERVAL_MS = 60_000; // every 60 seconds
    const statsTimer = setInterval(() => {
      const stats = presenceManager.getStats();
      console.log(
        `[Socket] 📊 Stats | sockets=${stats.connectedSockets} | users=${stats.onlineUsers} | rooms=${stats.activeRooms}`
      );
    }, STATS_INTERVAL_MS);

    // Ensure the timer doesn't prevent graceful shutdown
    statsTimer.unref();
  }

  console.log("[Socket] ✅ Socket.io initialized");

  return io;
};

/**
 * Get a snapshot of current presence stats.
 * Used by the /api/health route to surface socket metrics.
 */
const getSocketStats = () => presenceManager.getStats();

module.exports = { initSocket, getSocketStats };
