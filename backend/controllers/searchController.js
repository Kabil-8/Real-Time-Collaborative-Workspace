const Card = require("../models/Card");
const Board = require("../models/Board");
const Workspace = require("../models/Workspace");
const List = require("../models/List");
const { successResponse, errorResponse } = require("../utils/response");

/**
 * GET /api/search
 * Query params:
 *   q           - search term (required, min 2 chars)
 *   workspaceId - restrict to a specific workspace (optional)
 *   type        - "all" | "boards" | "cards" (default: "all")
 *   limit       - max results per category (default: 20)
 */
exports.search = async (req, res, next) => {
  try {
    const { q, workspaceId, type = "all", limit = 20 } = req.query;

    if (!q || q.trim().length < 2) {
      return errorResponse(res, "Search query must be at least 2 characters.", 400);
    }

    const userId = req.user._id;
    const parsedLimit = Math.min(parseInt(limit) || 20, 50);
    const searchTerm = q.trim();

    // ── Determine which workspaces the user can see ──────────────────────────
    // Find all workspaces where the user is a member
    let workspaceFilter = {};
    if (workspaceId) {
      // Verify user is a member of the requested workspace
      const ws = await Workspace.findOne({
        _id: workspaceId,
        "members.user": userId,
        isArchived: false,
      });
      if (!ws) return errorResponse(res, "Workspace not found or access denied.", 403);
      workspaceFilter = { workspace: workspaceId };
    } else {
      const userWorkspaces = await Workspace.find({
        "members.user": userId,
        isArchived: false,
      }).select("_id");
      const wsIds = userWorkspaces.map((w) => w._id);
      workspaceFilter = { workspace: { $in: wsIds } };
    }

    // ── Build results ────────────────────────────────────────────────────────
    const results = {};

    // ── Board search ─────────────────────────────────────────────────────────
    if (type === "all" || type === "boards") {
      let boardQuery = {
        ...workspaceFilter,
        isArchived: false,
      };

      let boards;
      // Try full-text search first, fall back to regex
      try {
        boards = await Board.find({
          ...boardQuery,
          $text: { $search: searchTerm },
        })
          .select("title description background members workspace lastActivity createdAt")
          .populate("workspace", "name")
          .sort({ score: { $meta: "textScore" } })
          .limit(parsedLimit)
          .lean();
      } catch {
        boards = [];
      }

      // Regex fallback (in case text index not yet built)
      if (boards.length === 0) {
        const regex = new RegExp(searchTerm, "i");
        boards = await Board.find({
          ...boardQuery,
          $or: [{ title: regex }, { description: regex }],
        })
          .select("title description background members workspace lastActivity createdAt")
          .populate("workspace", "name")
          .sort({ lastActivity: -1 })
          .limit(parsedLimit)
          .lean();
      }

      results.boards = boards;
    }

    // ── Card search ───────────────────────────────────────────────────────────
    if (type === "all" || type === "cards") {
      // Get boards the user has access to
      const accessibleBoards = await Board.find({
        ...workspaceFilter,
        isArchived: false,
        "members.user": userId,
      }).select("_id").lean();

      const boardIds = accessibleBoards.map((b) => b._id);

      let cardQuery = {
        board: { $in: boardIds },
        isArchived: false,
      };

      let cards;
      // Try full-text search first
      try {
        cards = await Card.find({
          ...cardQuery,
          $text: { $search: searchTerm },
        })
          .select("title description priority dueDate assignees labels board list createdAt")
          .populate("assignees", "name avatar avatarColor")
          .populate("board", "title background")
          .populate("list", "title")
          .sort({ score: { $meta: "textScore" } })
          .limit(parsedLimit)
          .lean();
      } catch {
        cards = [];
      }

      // Regex fallback
      if (cards.length === 0) {
        const regex = new RegExp(searchTerm, "i");
        cards = await Card.find({
          ...cardQuery,
          $or: [
            { title: regex },
            { description: regex },
            { "comments.text": regex },
          ],
        })
          .select("title description priority dueDate assignees labels board list createdAt")
          .populate("assignees", "name avatar avatarColor")
          .populate("board", "title background")
          .populate("list", "title")
          .sort({ updatedAt: -1 })
          .limit(parsedLimit)
          .lean();
      }

      results.cards = cards;
    }

    return successResponse(
      res,
      {
        query: searchTerm,
        type,
        results,
        counts: {
          boards: results.boards?.length ?? 0,
          cards: results.cards?.length ?? 0,
          total: (results.boards?.length ?? 0) + (results.cards?.length ?? 0),
        },
      },
      "Search completed."
    );
  } catch (err) {
    next(err);
  }
};
