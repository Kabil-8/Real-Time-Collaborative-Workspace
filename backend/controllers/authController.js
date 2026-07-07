const { body } = require("express-validator");
const crypto = require("crypto");
const User = require("../models/User");
const { sendAuthResponse } = require("../utils/jwt");
const { successResponse, errorResponse } = require("../utils/response");
const sendEmail = require("../utils/email");

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

exports.forgotPasswordValidation = [
  body("email")
    .trim()
    .notEmpty().withMessage("Email is required")
    .isEmail().withMessage("Please enter a valid email"),
];

exports.resetPasswordValidation = [
  body("password")
    .notEmpty().withMessage("Password is required")
    .isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
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

/**
 * POST /api/auth/forgot-password
 */
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    // Return generic success to prevent email enumeration
    if (!user) {
      return successResponse(
        res,
        {},
        "If that email is registered, we have sent a password reset link to it."
      );
    }

    // 1) Generate the random reset token
    const resetToken = crypto.randomBytes(32).toString("hex");

    // 2) Hash it and set to user model with 10-minute expiry
    const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");
    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = Date.now() + 10 * 60 * 1000;
    await user.save({ validateBeforeSave: false });

    // 3) Create reset URL pointing to frontend
    const clientOrigin = process.env.CLIENT_ORIGIN || "http://localhost:3000";
    const resetUrl = `${clientOrigin}/reset-password/${resetToken}`;

    // 4) Send email
    const textMessage = `You are receiving this email because you (or someone else) have requested the reset of the password for your account.\n\nPlease click on the following link, or paste this into your browser to complete the process within 10 minutes:\n\n${resetUrl}\n\nIf you did not request this, please ignore this email and your password will remain unchanged.\n`;

    const htmlMessage = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
        <h2 style="color: #0f172a; margin-bottom: 16px;">Password Reset Request</h2>
        <p style="color: #475569; font-size: 16px; line-height: 24px;">
          You are receiving this email because you (or someone else) have requested the reset of the password for your account.
        </p>
        <p style="color: #475569; font-size: 16px; line-height: 24px;">
          Please click the button below to reset your password. This link is only valid for 10 minutes.
        </p>
        <div style="margin: 24px 0;">
          <a href="${resetUrl}" style="background-color: #06b6d4; color: #0f172a; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 8px; display: inline-block;">
            Reset Password
          </a>
        </div>
        <p style="color: #94a3b8; font-size: 14px;">
          If the button above does not work, copy and paste the link below into your browser:
        </p>
        <p style="color: #06b6d4; font-size: 14px; word-break: break-all;">
          <a href="${resetUrl}" style="color: #06b6d4;">${resetUrl}</a>
        </p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="color: #64748b; font-size: 12px;">
          If you did not request this reset, please ignore this email.
        </p>
      </div>
    `;

    try {
      const emailResult = await sendEmail({
        to: user.email,
        subject: "Zaalima - Password Reset Link (Valid for 10 mins)",
        text: textMessage,
        html: htmlMessage,
      });

      const responseData = {};
      if (process.env.NODE_ENV !== "production") {
        responseData.devResetUrl = resetUrl;
        if (emailResult && emailResult.previewUrl) {
          responseData.emailPreviewUrl = emailResult.previewUrl;
        }
      }

      return successResponse(
        res,
        responseData,
        "If that email is registered, we have sent a password reset link to it."
      );
    } catch (err) {
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save({ validateBeforeSave: false });
      return errorResponse(res, "There was an error sending the email. Try again later.", 500);
    }
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/reset-password/:token
 */
exports.resetPassword = async (req, res, next) => {
  try {
    const { password } = req.body;
    const { token } = req.params;

    // 1) Hash the token from parameter
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    // 2) Find the user by token & check expiry
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    }).select("+password");

    if (!user) {
      return errorResponse(res, "Password reset token is invalid or has expired.", 400);
    }

    // 3) Set new password and clear token fields
    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    // 4) Log the user in directly (send token response)
    return sendAuthResponse(res, 200, user);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/auth/users
 * Returns list of all registered users
 */
exports.getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find({}).select("name email avatar avatarColor");
    return successResponse(res, { users });
  } catch (err) {
    next(err);
  }
};
