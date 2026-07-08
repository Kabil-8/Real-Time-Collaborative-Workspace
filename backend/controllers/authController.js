const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { sendAuthResponse } = require("../utils/jwt");
const { errorResponse, successResponse } = require("../utils/response");

async function register(req, res, next) {
  try {
    const { name, email, password } = req.body;
    const existing = await User.findOne({ email });
    if (existing) return errorResponse(res, "Email already in use", 409);
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, passwordHash });
    return sendAuthResponse(res, user, 201);
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return errorResponse(res, "Invalid credentials", 401);
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return errorResponse(res, "Invalid credentials", 401);
    return sendAuthResponse(res, user);
  } catch (err) {
    next(err);
  }
}

async function me(req, res, next) {
  try {
    const user = await User.findById(req.userId);
    if (!user) return errorResponse(res, "User not found", 404);
    return successResponse(res, {
      user: {
        id: String(user._id),
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl || "",
      },
    });
  } catch (err) {
    next(err);
  }
}

async function updateProfile(req, res, next) {
  try {
    const { name, avatarUrl } = req.body;
    const update = {};
    if (typeof name === "string") update.name = name;
    if (typeof avatarUrl === "string") update.avatarUrl = avatarUrl;
    const user = await User.findByIdAndUpdate(req.userId, update, { new: true });
    if (!user) return errorResponse(res, "User not found", 404);
    return successResponse(res, {
      user: {
        id: String(user._id),
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl || "",
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, me, updateProfile };