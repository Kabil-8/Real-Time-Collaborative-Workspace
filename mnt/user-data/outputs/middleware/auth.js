const { verifyToken } = require("../utils/jwt");
const { errorResponse } = require("../utils/response");
const User = require("../models/User");
const Workspace = require("../models/Workspace");
const Board = require("../models/Board");

/**
 * protect — verifies JWT and attaches req.user
 */
const protect = async (req, res, next) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer ")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return errorResponse(res, "Not authenticated. Please log in.", 401);
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return errorResponse(res, "Invalid or expired token.", 401);
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      return errorResponse(res, "User no longer exists.", 401);
    }

    // Update last active timestamp (fire-and-forget)
    User.findByIdAndUpdate(user._id, { lastActive: new Date() }).exec();

    req.user = user;
    next();
  } catch (error) {
    return errorResponse(res, "Authentication error.", 401);
  }
};

/**
 * requireWorkspaceMember — checks the user is a member of req.params.workspaceId
 * Must be used after protect
 */
const requireWorkspaceMember = async (req, res, next) => {
  try {
    const { workspaceId } = req.params;
    const workspace = await Workspace.findById(workspaceId);

    if (!workspace || workspace.isArchived) {
      return errorResponse(res, "Workspace not found.", 404);
    }

    if (!workspace.isMember(req.user._id)) {
      return errorResponse(res, "Access denied. You are not a member of this workspace.", 403);
    }

    req.workspace = workspace;
    req.userRole = workspace.getMemberRole(req.user._id);
    next();
  } catch (error) {
    return errorResponse(res, "Failed to verify workspace access.", 500);
  }
};

/**
 * requireWorkspaceAdmin — user must be owner or admin
 */
const requireWorkspaceAdmin = async (req, res, next) => {
  try {
    const { workspaceId } = req.params;
    const workspace = req.workspace || (await Workspace.findById(workspaceId));

    if (!workspace) {
      return errorResponse(res, "Workspace not found.", 404);
    }

    const role = workspace.getMemberRole(req.user._id);
    if (!["owner", "admin"].includes(role)) {
      return errorResponse(res, "Admin or owner privileges required.", 403);
    }

    req.workspace = workspace;
    req.userRole = role;
    next();
  } catch (error) {
    return errorResponse(res, "Failed to verify admin access.", 500);
  }
};

/**
 * requireBoardAccess — verifies user has access to a board via workspace membership
 */
const requireBoardAccess = async (req, res, next) => {
  try {
    const { boardId } = req.params;
    const board = await Board.findById(boardId).populate("workspace");

    if (!board || board.isArchived) {
      return errorResponse(res, "Board not found.", 404);
    }

    if (!board.workspace.isMember(req.user._id)) {
      return errorResponse(res, "Access denied.", 403);
    }

    req.board = board;
    req.workspace = board.workspace;
    req.userRole = board.workspace.getMemberRole(req.user._id);
    next();
  } catch (error) {
    return errorResponse(res, "Failed to verify board access.", 500);
  }
};

module.exports = {
  protect,
  requireWorkspaceMember,
  requireWorkspaceAdmin,
  requireBoardAccess,
};
