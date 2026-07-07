const mongoose = require("mongoose");

/**
 * Role — system-level access document.
 *
 * Each user can have one Role document that grants platform-wide
 * privileges beyond the workspace/board-level roles that already
 * exist on Workspace.members and Board.members.
 *
 * Hierarchy (highest → lowest):
 *   superadmin → admin → moderator → user
 *
 * Usage:
 *   const role = await Role.findOne({ user: req.user._id });
 *   if (role?.isSuperAdmin()) { ... }
 */

const SYSTEM_ROLES = ["user", "moderator", "admin", "superadmin"];

const permissionSchema = new mongoose.Schema(
  {
    // Fine-grained permission flags
    canManageUsers:      { type: Boolean, default: false },
    canManageWorkspaces: { type: Boolean, default: false },
    canManageBoards:     { type: Boolean, default: false },
    canViewAnalytics:    { type: Boolean, default: false },
    canManageRoles:      { type: Boolean, default: false },
    canImpersonate:      { type: Boolean, default: false }, // superadmin only
  },
  { _id: false }
);

const roleSchema = new mongoose.Schema(
  {
    // The user this role belongs to (1-to-1)
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },

    // System-level role name
    role: {
      type: String,
      enum: SYSTEM_ROLES,
      default: "user",
    },

    // Granular permission overrides (merged on top of role defaults)
    permissions: {
      type: permissionSchema,
      default: () => ({}),
    },

    // Audit trail — who granted this role and when
    grantedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    grantedAt: {
      type: Date,
      default: Date.now,
    },

    // Optional expiry for temporary elevated access
    expiresAt: {
      type: Date,
      default: null,
    },

    // Soft-disable without deleting
    isActive: {
      type: Boolean,
      default: true,
    },

    // Reason / notes stored for audit
    notes: {
      type: String,
      trim: true,
      maxlength: [500, "Notes cannot exceed 500 characters"],
      default: "",
    },
  },
  { timestamps: true }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
roleSchema.index({ role: 1 });
roleSchema.index({ expiresAt: 1 }, { sparse: true }); // for TTL queries

// ─── Virtuals ─────────────────────────────────────────────────────────────────

/** True if the role grant is currently valid (active + not expired) */
roleSchema.virtual("isValid").get(function () {
  if (!this.isActive) return false;
  if (this.expiresAt && this.expiresAt < new Date()) return false;
  return true;
});

/** Numeric rank of the role — useful for comparison */
roleSchema.virtual("rank").get(function () {
  return SYSTEM_ROLES.indexOf(this.role);
});

// ─── Methods ──────────────────────────────────────────────────────────────────

/** Check if the role has at least the given role level */
roleSchema.methods.hasRole = function (requiredRole) {
  if (!this.isValid) return false;
  const requiredRank = SYSTEM_ROLES.indexOf(requiredRole);
  return this.rank >= requiredRank;
};

roleSchema.methods.isAdmin = function () {
  return this.hasRole("admin");
};

roleSchema.methods.isSuperAdmin = function () {
  return this.hasRole("superadmin");
};

roleSchema.methods.isModerator = function () {
  return this.hasRole("moderator");
};

/** Check a specific fine-grained permission */
roleSchema.methods.can = function (permission) {
  if (!this.isValid) return false;
  // superadmin can do everything
  if (this.role === "superadmin") return true;
  return !!this.permissions?.[permission];
};

// ─── Statics ──────────────────────────────────────────────────────────────────

/**
 * Get or create the Role document for a user.
 * New users always start as "user" role.
 */
roleSchema.statics.getForUser = async function (userId) {
  let role = await this.findOne({ user: userId });
  if (!role) {
    role = await this.create({ user: userId, role: "user" });
  }
  return role;
};

/**
 * Promote a user to admin.
 * @param {ObjectId} userId       — target user
 * @param {ObjectId} grantedById  — who is granting
 * @param {Object}   options      — { notes, expiresAt }
 */
roleSchema.statics.promoteToAdmin = async function (userId, grantedById, options = {}) {
  return this.findOneAndUpdate(
    { user: userId },
    {
      $set: {
        role: "admin",
        grantedBy: grantedById,
        grantedAt: new Date(),
        isActive: true,
        notes: options.notes || "Promoted to admin",
        expiresAt: options.expiresAt || null,
        permissions: {
          canManageUsers: true,
          canManageWorkspaces: true,
          canManageBoards: true,
          canViewAnalytics: true,
          canManageRoles: false,  // only superadmin can manage roles
          canImpersonate: false,
        },
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
};

/**
 * Revoke elevated access — demote back to "user".
 */
roleSchema.statics.revoke = async function (userId) {
  return this.findOneAndUpdate(
    { user: userId },
    {
      $set: {
        role: "user",
        isActive: true,
        permissions: {},
        notes: "Access revoked",
        expiresAt: null,
      },
    },
    { upsert: true, new: true }
  );
};

/**
 * List all admins and superadmins (active, non-expired).
 */
roleSchema.statics.listAdmins = async function () {
  return this.find({
    role: { $in: ["admin", "superadmin"] },
    isActive: true,
    $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
  }).populate("user", "name email avatar avatarColor").populate("grantedBy", "name email");
};

// ─── Pre-save hook ────────────────────────────────────────────────────────────

/**
 * Auto-populate permissions based on role when saved.
 * Fine-grained overrides set manually will be preserved.
 */
roleSchema.pre("save", function (next) {
  if (!this.isModified("role")) return next();

  const defaults = {
    user: {
      canManageUsers: false, canManageWorkspaces: false, canManageBoards: false,
      canViewAnalytics: false, canManageRoles: false, canImpersonate: false,
    },
    moderator: {
      canManageUsers: false, canManageWorkspaces: false, canManageBoards: true,
      canViewAnalytics: true, canManageRoles: false, canImpersonate: false,
    },
    admin: {
      canManageUsers: true, canManageWorkspaces: true, canManageBoards: true,
      canViewAnalytics: true, canManageRoles: false, canImpersonate: false,
    },
    superadmin: {
      canManageUsers: true, canManageWorkspaces: true, canManageBoards: true,
      canViewAnalytics: true, canManageRoles: true, canImpersonate: true,
    },
  };

  this.permissions = { ...defaults[this.role], ...this.permissions?.toObject?.() };
  next();
});

const Role = mongoose.model("Role", roleSchema);

module.exports = { Role, SYSTEM_ROLES };
