require("dotenv").config();
const express = require("express");
const http = require("http");
const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");

const connectDB = require("./config/db");
const errorHandler = require("./middleware/errorHandler");
const { initSocket, getSocketStats } = require("./socket");

const authRoutes = require("./routes/auth");
const workspaceRoutes = require("./routes/workspaces");
const boardRoutes = require("./routes/boards");
const listRoutes = require("./routes/lists");
const cardRoutes = require("./routes/cards");
const searchRoutes = require("./routes/search");

// ─── App & HTTP server setup ──────────────────────────────────────────────────
const app = express();
const httpServer = http.createServer(app);

// ─── Socket.io — Day 1-2: JWT auth + connection/disconnect handling ───────────
// All socket logic lives in ./socket/ (authMiddleware, presenceManager, handlers)
const io = initSocket(httpServer, app);

// ─── Security & Parsing ───────────────────────────────────────────────────────
app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting — global
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  message: { success: false, message: "Too many requests, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api", limiter);

// Stricter limit on auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: "Too many auth attempts. Try again in 15 minutes." },
});
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/workspaces", workspaceRoutes);
app.use("/api/boards", boardRoutes);
app.use("/api/lists", listRoutes);
app.use("/api/cards", cardRoutes);
app.use("/api/search", searchRoutes);

// ─── Health check (includes live socket stats) ────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Zaalima Workspace API is running",
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
    socket: getSocketStats(), // { connectedSockets, onlineUsers, activeRooms }
  });
});

// ─── 404 handler ─────────────────────────────────────────────────────────────
app.use("*", (req, res) => {
  res.status(404).json({ success: false, message: "Route not found." });
});

// ─── Global error handler (must be last) ─────────────────────────────────────
app.use(errorHandler);

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  httpServer.listen(PORT, () => {
    console.log(`\n🚀 Zaalima Workspace API`);
    console.log(`   Server  : http://localhost:${PORT}`);
    console.log(`   Health  : http://localhost:${PORT}/api/health`);
    console.log(`   Env     : ${process.env.NODE_ENV || "development"}`);
    console.log(`   Socket  : JWT-authenticated Socket.io active\n`);
  });
});

module.exports = { app, io };
