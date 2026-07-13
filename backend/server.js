require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const rateLimit = require("express-rate-limit");
const { Server } = require("socket.io");

const connectDB = require("./config/db");
const { errorHandler, notFound } = require("./middleware/errorHandler");
const { verifyToken } = require("./utils/jwt");
const Board = require("./models/Board");
const Workspace = require("./models/Workspace");

const authRoutes = require("./routes/auth");
const workspaceRoutes = require("./routes/workspaces");
const boardRoutes = require("./routes/boards");

async function start() {
  await connectDB();

  const app = express();
  const server = http.createServer(app);

  const io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_ORIGIN || "http://localhost:3000",
      credentials: true,
    },
  });

  app.set("io", io);

  app.use(
    cors({
      origin: process.env.CLIENT_ORIGIN || "http://localhost:3000",
      credentials: true,
    })
  );
  app.use(express.json({ limit: "1mb" }));

  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use("/api", apiLimiter);

  app.get("/api/health", (_req, res) => res.json({ ok: true }));

  app.use("/api/auth", authRoutes);
  app.use("/api/workspaces", workspaceRoutes);
  app.use("/api/boards", boardRoutes);

  app.use(notFound);
  app.use(errorHandler);

  io.on("connection", (socket) => {
    let userId = null;
    try {
      const token = socket.handshake.auth?.token;
      if (token) userId = verifyToken(token).sub;
    } catch {
      /* unauthenticated sockets can still connect but cannot join rooms */
    }

    socket.on("join-board", async (boardId) => {
      if (!userId || !boardId) return;
      try {
        const board = await Board.findById(boardId).lean();
        if (!board) return;
        const ws = await Workspace.findById(board.workspaceId).lean();
        if (!ws) return;
        const isMember = ws.members.some((m) => String(m.userId) === String(userId));
        if (isMember) socket.join(`board:${boardId}`);
      } catch {
        /* ignore */
      }
    });
    socket.on("leave-board", (boardId) => socket.leave(`board:${boardId}`));
  });

  const port = Number(process.env.PORT) || 4000;
  server.listen(port, () => {
    console.log(`[api] listening on http://localhost:${port}`);
  });
}

start().catch((err) => {
  console.error("[fatal]", err);
  process.exit(1);
});