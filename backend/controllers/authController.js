const { body } = require("express-validator");
const User = require("../models/User");
const { sendAuthResponse } = require("../utils/jwt");
const { successResponse, errorResponse } = require("../utils/response");

// ─── Validation chains ────────────────────────────────────────────────────────

exports.registerValidation = [
  body("name")
    .trim()
    .notEmpty().withMessage("Name is required")
    .isLength({ max: 80 }).withMessage("Name must be 80 characters or fewer"),
  body("email")
    .trim()
    .notEmpty().withMessage("Email is required")
    .isEmail().withMessage("Please enter a valid email"),
  body("password")
    .notEmpty().withMessage("Password is required")
    .isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
];

exports.loginValidation = [
  body("email").trim().notEmpty().isEmail().withMessage("Valid email is required"),
  body("password").notEmpty().withMessage("Password is required"),
];

// ─── Controllers ──────────────────────────────────────────────────────────────

/**
 * POST /api/auth/register
 */
exports.register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      return errorResponse(res, "An account with this email already exists.", 409);
    }

    const user = await User.create({ name, email, password });
    sendAuthResponse(res, 201, user);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/login
 */
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select("+password");
    if (!user || !(await user.comparePassword(password))) {
      return errorResponse(res, "Invalid email or password.", 401);
    }

    sendAuthResponse(res, 200, user);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/auth/me
 * Returns the authenticated user's profile
 */
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    return successResponse(res, { user: user.toPublicJSON() });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/auth/me
 * Update name or avatar
 */
exports.updateMe = async (req, res, next) => {
  try {
    const { name, avatar, avatarColor } = req.body;
    const updates = {};
    if (name) updates.name = name.trim().slice(0, 80);
    if (avatar !== undefined) updates.avatar = avatar;
    if (avatarColor) updates.avatarColor = avatarColor;

    const user = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true,
    });

    return successResponse(res, { user: user.toPublicJSON() }, "Profile updated.");
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/change-password
 */
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return errorResponse(res, "Both currentPassword and newPassword are required.", 400);
    }
    if (newPassword.length < 6) {
      return errorResponse(res, "New password must be at least 6 characters.", 400);
    }

    const user = await User.findById(req.user._id).select("+password");
    if (!(await user.comparePassword(currentPassword))) {
      return errorResponse(res, "Current password is incorrect.", 401);
    }

    user.password = newPassword;
    await user.save();

    return successResponse(res, {}, "Password changed successfully.");
  } catch (err) {
    next(err);
  }
};
