const jwt = require("jsonwebtoken");

function signToken(userId) {
  return jwt.sign({ sub: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
}

function verifyToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}

function sendAuthResponse(res, user, status = 200) {
  const token = signToken(String(user._id));
  res.status(status).json({
    success: true,
    data: {
      token,
      user: {
        id: String(user._id),
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl || "",
      },
    },
  });
}

module.exports = { signToken, verifyToken, sendAuthResponse };