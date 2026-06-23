const Board = require("../models/Board");
const Card = require("../models/Card");
const List = require("../models/List");
const { successResponse, errorResponse } = require("../utils/response");

/**
 * GET /api/search?q=<query>&workspaceId=<id>
 * Searches boards and cards accessible by the authenticated user.
 */
const search = async (req, res, next) => {
  try {
    const { q = "", workspaceId } = req.query;
    const query = q.trim();

    if (!query) {
      return successResponse(res, { boards: [], cards: [] });
    }

    // We need a workspaceId to scope results, but fall back to all
    // workspaces the user has access to if not provided.
    const regex = new RegExp(query, "i");

    // ── Gather board IDs the user has access to ──────────────────────────────
    const boardFilter = {
      isArchived: false,
      "members.user": req.user._id,
    };
    if (workspaceId) boardFilter.workspace = workspaceId;

    const boards = await Board.find({
      ...boardFilter,
      title: { $regex: regex },
    })
      .select("_id title description background workspace isStarred")
      .limit(10)
      .lean();

    // Get all accessible board IDs for card scoping
    const allAccessibleBoards = await Board.find(boardFilter)
      .select("_id")
      .lean();
    const accessibleBoardIds = allAccessibleBoards.map((b) => b._id);

    // ── Search cards ─────────────────────────────────────────────────────────
    const rawCards = await Card.find({
      board: { $in: accessibleBoardIds },
      isArchived: false,
      $or: [
        { title: { $regex: regex } },
        { description: { $regex: regex } },
      ],
    })
      .select("_id title description board list priority dueDate coverColor labels assignees")
      .populate("board", "title _id")
      .populate("list", "title _id")
      .populate("assignees", "name email avatarColor")
      .limit(20)
      .lean();

    return successResponse(res, { boards, cards: rawCards });
  } catch (err) {
    next(err);
  }
};

module.exports = { search };
