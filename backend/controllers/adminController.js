const { Role } = require("../models/Role");
const User = require("../models/User");
const { successResponse, errorResponse } = require("../utils/response");

// ─── GET /api/admin/users ─────────────────────────────────────────────────────
/**
 * List all users with their roles.
 * Requires admin or superadmin.
 */
exports.listUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search = "" } = req.query;

    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [users, total] = await Promise.all([
      User.find(query)
        .select("name email avatar avatarColor systemRole lastActive createdAt")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      User.countDocuments(query),
    ]);

    // Attach role details
    const roles = await Role.find({ user: { $in: users.map((u) => u._id) } })
      .select("user role permissions isActive expiresAt grantedAt grantedBy")
      .populate("grantedBy", "name email");

    const roleMap = {};
    roles.forEach((r) => { roleMap[r.user.toString()] = r; });

    const usersWithRoles = users.map((u) => ({
      ...u.toObject(),
      roleDetail: roleMap[u._id.toString()] || null,
    }));

    return res.json({
      success: true,
      users: usersWithRoles,
      meta: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/admin/admins ────────────────────────────────────────────────────
/**
 * List all current admins & superadmins.
 */
exports.listAdmins = async (req, res, next) => {
  try {
    const admins = await Role.listAdmins();
    return successResponse(res, { admins });
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/admin/users/:userId/promote ────────────────────────────────────
/**
 * Promote a user to admin (or a specified role).
 * Body: { role?: "admin"|"moderator"|"superadmin", notes?, expiresAt? }
 * Only superadmin can grant superadmin.
 */
exports.promoteUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { role = "admin", notes, expiresAt } = req.body;

    const ALLOWED_ROLES = ["moderator", "admin"];
    const requesterRole = await Role.getForUser(req.user._id);

    // Only superadmin can grant superadmin
    if (role === "superadmin") {
      if (!requesterRole.isSuperAdmin()) {
        return errorResponse(res, "Only superadmins can grant superadmin access.", 403);
      }
      ALLOWED_ROLES.push("superadmin");
    }

    if (!["moderator", "admin", "superadmin"].includes(role)) {
      return errorResponse(res, `Invalid role. Must be one of: moderator, admin, superadmin.`, 400);
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) return errorResponse(res, "User not found.", 404);

    // Cannot demote yourself
    if (userId === req.user._id.toString()) {
      return errorResponse(res, "You cannot change your own system role.", 403);
    }

    // Update the Role document
    const updatedRole = await Role.findOneAndUpdate(
      { user: userId },
      {
        $set: {
          role,
          grantedBy: req.user._id,
          grantedAt: new Date(),
          isActive: true,
          notes: notes || `Promoted to ${role} by ${req.user.name}`,
          expiresAt: expiresAt ? new Date(expiresAt) : null,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Keep User.systemRole in sync
    await User.findByIdAndUpdate(userId, { systemRole: role });

    const populated = await updatedRole.populate("user", "name email avatar avatarColor");
    await populated.populate("grantedBy", "name email");

    return successResponse(res, { role: populated }, `User promoted to ${role}.`);
  } catch (err) {
    next(err);
  }
};

// ─── DELETE /api/admin/users/:userId/role ─────────────────────────────────────
/**
 * Revoke elevated access — demote back to "user".
 */
exports.revokeRole = async (req, res, next) => {
  try {
    const { userId } = req.params;

    if (userId === req.user._id.toString()) {
      return errorResponse(res, "You cannot revoke your own role.", 403);
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) return errorResponse(res, "User not found.", 404);

    // Prevent revoking a superadmin unless you are superadmin
    const targetRole = await Role.getForUser(userId);
    const requesterRole = await Role.getForUser(req.user._id);
    if (targetRole.role === "superadmin" && !requesterRole.isSuperAdmin()) {
      return errorResponse(res, "Only a superadmin can revoke another superadmin.", 403);
    }

    await Role.revoke(userId);
    await User.findByIdAndUpdate(userId, { systemRole: "user" });

    return successResponse(res, {}, "Role revoked. User is now a regular user.");
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/admin/users/:userId/role ────────────────────────────────────────
/**
 * Get role details for a specific user.
 */
exports.getUserRole = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const role = await Role.getForUser(userId);
    const populated = await role.populate("user", "name email avatar avatarColor");
    await populated.populate("grantedBy", "name email");
    return successResponse(res, { role: populated });
  } catch (err) {
    next(err);
  }
};
