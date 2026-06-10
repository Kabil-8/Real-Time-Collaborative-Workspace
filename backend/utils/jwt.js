const jwt = require("jsonwebtoken");

/**
 * Sign a JWT for a given user ID
 */
const signToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
};

/**
 * Verify a JWT and return the decoded payload, or null on failure
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return null;
  }
};

/**
 * Build and send a standardised auth response with token + user
 */
const sendAuthResponse = (res, statusCode, user) => {
  const token = signToken(user._id);
  res.status(statusCode).json({
    success: true,
    token,
    user: user.toPublicJSON ? user.toPublicJSON() : user,
  });
};

module.exports = { signToken, verifyToken, sendAuthResponse };
