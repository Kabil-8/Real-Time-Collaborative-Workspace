const { body } = require("express-validator");
const Workspace = require("../models/Workspace");
const User = require("../models/User");
const Board = require("../models/Board");
const { successResponse, errorResponse } = require("../utils/response");


exports.createWorkspaceValidation = [
  body("name")
    .trim()
    .notEmpty().withMessage("Workspace name is required")
    .isLength({ max: 100 }).withMessage("Name must be 100 characters or fewer"),
  body("description")
    .optional()
    .isLength({ max: 500 }).withMessage("Description must be 500 characters or fewer"),
];

exports.inviteMemberValidation = [
  body("email").trim().isEmail().withMessage("Valid email is required"),
  body("role")
    .optional()
    .isIn(["admin", "member", "viewer"]).withMessage("Invalid role"),
];

// ─── Controllers ──────────────────────────────────────────────────────────────

/**
 * POST /api/workspaces
 * Create a new workspace
 */
exports.createWorkspace = async (req, res, next) => {
  try {
    const { name, description, icon, color } = req.body;
    const workspace = await Workspace.create({
      name,
      description,
      icon: icon || "🏢",
      color: color || "#6366f1",
      owner: req.user._id,
    });

    const populated = await workspace.populate("members.user", "name email avatar avatarColor");
    return successResponse(res, { workspace: populated }, "Workspace created.", 201);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/workspaces
 * List all workspaces the current user is a member of
 */
exports.getMyWorkspaces = async (req, res, next) => {
  try {
    const workspaces = await Workspace.find({
      "members.user": req.user._id,
      isArchived: false,
    })
      .populate("members.user", "name email avatar avatarColor")
      .populate("owner", "name email avatar avatarColor")
      .sort({ updatedAt: -1 });

    return successResponse(res, { workspaces });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/workspaces/:workspaceId
 * Get a single workspace (requires membership)
 */
exports.getWorkspace = async (req, res, next) => {
  try {
    const workspace = await Workspace.findById(req.params.workspaceId)
      .populate("members.user", "name email avatar avatarColor lastActive")
      .populate("owner", "name email avatar avatarColor");

    if (!workspace || workspace.isArchived) {
      return errorResponse(res, "Workspace not found.", 404);
    }
    if (!workspace.isMember(req.user._id)) {
      return errorResponse(res, "Access denied.", 403);
    }

    // Get board count for the workspace
    const boardCount = await Board.countDocuments({
      workspace: workspace._id,
      isArchived: false,
    });

    return successResponse(res, { workspace, boardCount });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/workspaces/:workspaceId
 * Update workspace settings (admin/owner only)
 */
exports.updateWorkspace = async (req, res, next) => {
  try {
    const allowed = ["name", "description", "icon", "color", "settings"];
    const updates = {};
    allowed.forEach((key) => {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    });

    const workspace = await Workspace.findByIdAndUpdate(
      req.params.workspaceId,
      { $set: updates },
      { new: true, runValidators: true }
    ).populate("members.user", "name email avatar avatarColor");

    return successResponse(res, { workspace }, "Workspace updated.");
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/workspaces/:workspaceId
 * Archive a workspace (owner only)
 */
exports.archiveWorkspace = async (req, res, next) => {
  try {
    const workspace = await Workspace.findById(req.params.workspaceId);
    if (!workspace) return errorResponse(res, "Workspace not found.", 404);

    const role = workspace.getMemberRole(req.user._id);
    if (role !== "owner") {
      return errorResponse(res, "Only the workspace owner can archive it.", 403);
    }

    workspace.isArchived = true;
    await workspace.save();
    return successResponse(res, {}, "Workspace archived.");
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/workspaces/:workspaceId/invite
 * Invite a user by email; creates a pending invite token
 */
exports.inviteMember = async (req, res, next) => {
  try {
    const { email, role = "member" } = req.body;
    const workspace = req.workspace;

    // Check if already a member
    const existingUser = await User.findOne({ email });
    if (existingUser && workspace.isMember(existingUser._id)) {
      return errorResponse(res, "This user is already a member of the workspace.", 409);
    }

    // Check if an active invite already exists for this email
    const existingInvite = workspace.pendingInvites.find(
      (inv) => inv.email === email && !inv.usedAt && inv.expiresAt > new Date()
    );
    if (existingInvite) {
      return errorResponse(res, "An active invite already exists for this email.", 409);
    }

    workspace.pendingInvites.push({
      email,
      role,
      invitedBy: req.user._id,
    });
    await workspace.save();

    const invite = workspace.pendingInvites[workspace.pendingInvites.length - 1];
    const inviteLink = `${process.env.CLIENT_ORIGIN}/invite/${invite.token}`;

    // In production you'd send an email here
    return successResponse(
      res,
      {
        invite: {
          token: invite.token,
          email: invite.email,
          role: invite.role,
          expiresAt: invite.expiresAt,
          inviteLink,
        },
      },
      "Invite created successfully.",
      201
    );
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/workspaces/accept-invite/:token
 * Accept an invitation and join the workspace
 */
exports.acceptInvite = async (req, res, next) => {
  try {
    const { token } = req.params;

    const workspace = await Workspace.findOne({
      "pendingInvites.token": token,
    });

    if (!workspace) {
      return errorResponse(res, "Invalid or expired invite link.", 404);
    }

    const invite = workspace.getValidInvite(token);
    if (!invite) {
      return errorResponse(res, "This invite has expired or already been used.", 410);
    }

    // If invite was for a specific email, verify it matches
    if (invite.email && invite.email !== req.user.email) {
      return errorResponse(res, "This invite was sent to a different email address.", 403);
    }

    if (workspace.isMember(req.user._id)) {
      return errorResponse(res, "You are already a member of this workspace.", 409);
    }

    workspace.members.push({ user: req.user._id, role: invite.role });
    invite.usedAt = new Date();
    await workspace.save();

    const populated = await workspace.populate("members.user", "name email avatar avatarColor");
    return successResponse(res, { workspace: populated }, "You have joined the workspace!");
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/workspaces/:workspaceId/members/:userId
 * Remove a member (admin/owner, or self-leave)
 */
exports.removeMember = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const workspace = req.workspace;
    const isSelf = userId === req.user._id.toString();

    if (!isSelf && !["owner", "admin"].includes(req.userRole)) {
      return errorResponse(res, "Insufficient privileges to remove members.", 403);
    }

    const targetRole = workspace.getMemberRole(userId);
    if (targetRole === "owner" && !isSelf) {
      return errorResponse(res, "Cannot remove the workspace owner.", 403);
    }

    workspace.members = workspace.members.filter(
      (m) => m.user.toString() !== userId
    );
    await workspace.save();

    return successResponse(res, {}, isSelf ? "You have left the workspace." : "Member removed.");
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/workspaces/:workspaceId/boards
 * List all boards in a workspace
 */
exports.getWorkspaceBoards = async (req, res, next) => {
  try {
    const boards = await Board.find({
      workspace: req.params.workspaceId,
      isArchived: false,
    })
      .populate("createdBy", "name avatar avatarColor")
      .sort({ lastActivity: -1 });

    return successResponse(res, { boards });
  } catch (err) {
    next(err);
  }
};
