

const { verifyToken } = require("../utils/jwt");
const User = require("../models/User");

/**
 * Extracts the raw JWT string from the socket handshake.
 * Returns null if no token is found.
 */
const extractToken = (socket) => {
  // 1. Preferred: auth option sent by client  { auth: { token: "..." } }
  if (socket.handshake.auth && socket.handshake.auth.token) {
    return socket.handshake.auth.token;
  }

  // 2. Fallback: Authorization header  "Bearer <token>"
  const authHeader = socket.handshake.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7).trim();
  }

  return null;
};

/**
 * Socket.io middleware — authenticate the JWT on every new connection.
 *
 * Usage:
 *   io.use(socketAuthMiddleware);
 */
const socketAuthMiddleware = async (socket, next) => {
  try {
    const token = extractToken(socket);

    if (!token) {
      const err = new Error("Authentication error: No token provided.");
      err.data = { code: "NO_TOKEN" };
      return next(err);
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      const err = new Error("Authentication error: Invalid or expired token.");
      err.data = { code: "INVALID_TOKEN" };
      return next(err);
    }

    // Lightweight DB check — ensures user still exists and hasn't been deleted.
    // Select only the fields we need to keep the query fast.
    const user = await User.findById(decoded.id).select(
      "_id name email avatar avatarColor"
    );

    if (!user) {
      const err = new Error("Authentication error: User no longer exists.");
      err.data = { code: "USER_NOT_FOUND" };
      return next(err);
    }

    // Attach safe user profile to socket for use in handlers
    socket.user = {
      _id: user._id.toString(),
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      avatarColor: user.avatarColor,
    };

    next();
  } catch (err) {
    // Catch unexpected errors (DB failure etc.) — never crash the server
    console.error("[Socket Auth] Unexpected error during handshake:", err.message);
    const authErr = new Error("Authentication error: Internal server error.");
    authErr.data = { code: "AUTH_ERROR" };
    next(authErr);
  }
};

module.exports = { socketAuthMiddleware };
