const { verifyToken } = require("../utils/jwt");
const User = require("../models/User");
const Workspace = require("../models/Workspace");
const Board = require("../models/Board");
const { Role } = require("../models/Role");
const { errorResponse } = require("../utils/response");

// ─── Protect — require a valid JWT ───────────────────────────────────────────
const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return errorResponse(res, "Not authenticated. Please log in.", 401);
    }

    const token = authHeader.split(" ")[1];
    const decoded = verifyToken(token);
    if (!decoded) {
      return errorResponse(res, "Invalid or expired token.", 401);
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      return errorResponse(res, "User no longer exists.", 401);
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};

// ─── requireWorkspaceMember — user must be a workspace member ─────────────────
const requireWorkspaceMember = async (req, res, next) => {
  try {
    const workspaceId = req.params.workspaceId;
    const workspace = await Workspace.findById(workspaceId)
      .populate("members.user", "name email avatar avatarColor");

    if (!workspace || workspace.isArchived) {
      return errorResponse(res, "Workspace not found.", 404);
    }

    if (!workspace.isMember(req.user._id)) {
      return errorResponse(res, "Access denied. You are not a member of this workspace.", 403);
    }

    req.workspace = workspace;
    req.userRole = workspace.getMemberRole(req.user._id);
    next();
  } catch (err) {
    next(err);
  }
};

// ─── requireWorkspaceAdmin — user must be owner or admin ─────────────────────
const requireWorkspaceAdmin = async (req, res, next) => {
  try {
    const workspaceId = req.params.workspaceId;
    const workspace = await Workspace.findById(workspaceId)
      .populate("members.user", "name email avatar avatarColor");

    if (!workspace || workspace.isArchived) {
      return errorResponse(res, "Workspace not found.", 404);
    }

    const role = workspace.getMemberRole(req.user._id);
    if (!["owner", "admin"].includes(role)) {
      return errorResponse(res, "Admin or owner privileges required.", 403);
    }

    req.workspace = workspace;
    req.userRole = role;
    next();
  } catch (err) {
    next(err);
  }
};

// ─── requireBoardAccess — user must be a board member ────────────────────────
const requireBoardAccess = async (req, res, next) => {
  try {
    const board = await Board.findById(req.params.boardId);

    if (!board || board.isArchived) {
      return errorResponse(res, "Board not found.", 404);
    }

    const isMember = board.members.some(
      (m) => m.user.toString() === req.user._id.toString()
    );
    if (!isMember) {
      return errorResponse(res, "Access denied. You are not a member of this board.", 403);
    }

    req.board = board;
    next();
  } catch (err) {
    next(err);
  }
};

// ─── requireAdmin — system-level admin check ─────────────────────────────────
/**
 * Must be called after `protect`.
 * Checks the Role document (authoritative) and falls back to User.systemRole cache.
 * Grants access to admin and superadmin.
 */
const requireAdmin = async (req, res, next) => {
  try {
    // Fast path — cached field
    if (!req.user.isAdmin()) {
      return errorResponse(res, "Admin access required.", 403);
    }
    // Authoritative check against Role document
    const role = await Role.getForUser(req.user._id);
    if (!role.isValid || !role.isAdmin()) {
      return errorResponse(res, "Admin access required or role has expired.", 403);
    }
    req.systemRole = role;
    next();
  } catch (err) {
    next(err);
  }
};

// ─── requireSuperAdmin ────────────────────────────────────────────────────────
const requireSuperAdmin = async (req, res, next) => {
  try {
    if (!req.user.isSuperAdmin()) {
      return errorResponse(res, "Superadmin access required.", 403);
    }
    const role = await Role.getForUser(req.user._id);
    if (!role.isValid || !role.isSuperAdmin()) {
      return errorResponse(res, "Superadmin access required or role has expired.", 403);
    }
    req.systemRole = role;
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = {
  protect,
  requireWorkspaceMember,
  requireWorkspaceAdmin,
  requireBoardAccess,
  requireAdmin,
  requireSuperAdmin,
};
