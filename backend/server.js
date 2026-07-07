require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const helmet = require("helmet");
const cors = require("cors");
const compression = require("compression");
const rateLimit = require("express-rate-limit");

const connectDB = require("./config/db");
const errorHandler = require("./middleware/errorHandler");
const sanitizeMiddleware = require("./middleware/sanitize");
const createLogger = require("./utils/logger");
const { initSocket } = require("./socketHandler");

const authRoutes         = require("./routes/auth");
const workspaceRoutes    = require("./routes/workspaces");
const boardRoutes        = require("./routes/boards");
const listRoutes         = require("./routes/lists");
const cardRoutes         = require("./routes/cards");
const adminRoutes        = require("./routes/admin");
const searchRoutes       = require("./routes/search");
const notificationRoutes = require("./routes/notifications");

// ─── App setup ────────────────────────────────────────────────────────────────
const app = express();
const httpServer = http.createServer(app);

// Socket.io
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_ORIGIN || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Attach io to app so controllers can emit events
app.set("io", io);

// ─── HTTP Request Logger ───────────────────────────────────────────────────────
app.use(createLogger());

// ─── Security Middleware ───────────────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc:  ["'self'"],
        styleSrc:   ["'self'", "'unsafe-inline'"],
        imgSrc:     ["'self'", "data:", "blob:"],
        connectSrc: ["'self'", process.env.CLIENT_ORIGIN || "http://localhost:3000"],
        fontSrc:    ["'self'", "https://fonts.gstatic.com"],
        objectSrc:  ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    crossOriginEmbedderPolicy: false, // allow socket.io
  })
);

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || "http://localhost:3000",
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    exposedHeaders: ["X-Total-Count"],
  })
);

// ─── Compression ──────────────────────────────────────────────────────────────
app.use(compression({ level: 6, threshold: 1024 }));

// ─── Body Parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ─── Input Sanitization (NoSQL injection, XSS, HPP) ──────────────────────────
app.use(sanitizeMiddleware);

// ─── Rate Limiting ────────────────────────────────────────────────────────────
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
app.use("/api/auth",          authRoutes);
app.use("/api/workspaces",    workspaceRoutes);
app.use("/api/boards",        boardRoutes);
// Lists: /api/boards/:boardId/lists
app.use("/api/boards/:boardId/lists", listRoutes);
// Cards (board-level move + list-scoped CRUD): /api/boards/:boardId/cards/...
app.use("/api/boards/:boardId/cards", cardRoutes);
// Admin: /api/admin (system-level role management)
app.use("/api/admin",         adminRoutes);
// Search: /api/search?q=...
app.use("/api/search",        searchRoutes);
// Notifications: /api/notifications
app.use("/api/notifications", notificationRoutes);

// ─── Health check ─────────────────────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Zaalima Workspace API is running",
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
    features: ["search", "notifications", "redis-cache", "real-time"],
  });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({ success: false, message: "Route not found." });
});

// Global error handler (must be last)
app.use(errorHandler);

// ─── Socket.io ────────────────────────────────────────────────────────────────
initSocket(io);

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  httpServer.listen(PORT, () => {
    console.log(`\n🚀 Zaalima Workspace API`);
    console.log(`   Server        : http://localhost:${PORT}`);
    console.log(`   Health        : http://localhost:${PORT}/api/health`);
    console.log(`   Search        : http://localhost:${PORT}/api/search`);
    console.log(`   Notifications : http://localhost:${PORT}/api/notifications`);
    console.log(`   Real-time     : Socket.io enabled (JWT auth + user rooms)`);
    console.log(`   Security      : Helmet, CORS, Sanitize, HPP, Rate-limit`);
    console.log(`   Env           : ${process.env.NODE_ENV || "development"}\n`);
  });
});

module.exports = { app, io };
