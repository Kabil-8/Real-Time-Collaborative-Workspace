/**
 * controllers/searchController.js
 *
 * GET /api/search
 *
 * Query params:
 *   q           {string}  — search term (required)
 *   workspaceId {string}  — scope to workspace
 *   type        {string}  — "all" | "boards" | "cards" (default: "all")
 *   priority    {string}  — comma-separated: "critical,high,medium,low,none"
 *   assigneeId  {string}  — filter cards by assigned user ID
 *   label       {string}  — label value substring match
 *   dueBefore   {string}  — ISO date — cards due before this date
 *   dueAfter    {string}  — ISO date — cards due after this date
 *   listId      {string}  — restrict cards to a specific list
 *   sort        {string}  — "relevance" | "dueDate" | "createdAt" (default: relevance)
 *   page        {number}  — page number (default: 1)
 *   limit       {number}  — results per page (default: 20, max: 50)
 *
 * Response: { boards, cards, total, page, pages }
 */

const Board        = require("../models/Board");
const Card         = require("../models/Card");
const { successResponse } = require("../utils/response");

const search = async (req, res, next) => {
  try {
    const {
      q          = "",
      workspaceId,
      type       = "all",
      priority,
      assigneeId,
      label,
      dueBefore,
      dueAfter,
      listId,
      sort       = "relevance",
    } = req.query;

    const page  = Math.max(1, parseInt(req.query.page,  10) || 1);
    const limit = Math.min(50, parseInt(req.query.limit, 10) || 20);
    const skip  = (page - 1) * limit;

    const query = q.trim();
    if (!query) return successResponse(res, { boards: [], cards: [], total: 0, page: 1, pages: 0 });

    const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

    // ── Board membership filter ───────────────────────────────────────────────
    const boardFilter = {
      isArchived:     false,
      "members.user": req.user._id,
    };
    if (workspaceId) boardFilter.workspace = workspaceId;

    // ── Board search ──────────────────────────────────────────────────────────
    let boards = [];
    if (type !== "cards") {
      boards = await Board.find({
        ...boardFilter,
        title: { $regex: regex },
      })
        .select("_id title description background workspace isStarred")
        .limit(10)
        .lean();
    }

    // ── Card search ───────────────────────────────────────────────────────────
    let cards  = [];
    let total  = 0;

    if (type !== "boards") {
      // Get all accessible board IDs
      const accessibleBoards = await Board.find(boardFilter).select("_id").lean();
      const accessibleIds    = accessibleBoards.map((b) => b._id);

      // Build card filter
      const cardFilter = {
        board:      { $in: accessibleIds },
        isArchived: false,
      };

      // Text match: try $text first (uses the text index), fall back to $or regex
      // We always use regex here for simplicity and cross-field substring support
      cardFilter.$or = [
        { title:       { $regex: regex } },
        { description: { $regex: regex } },
      ];

      // Advanced filters
      if (priority) {
        const priorities = priority.split(",").map((p) => p.trim()).filter(Boolean);
        if (priorities.length) cardFilter.priority = { $in: priorities };
      }

      if (assigneeId) {
        cardFilter.assignees = assigneeId;
      }

      if (label) {
        cardFilter.labels = { $regex: new RegExp(label, "i") };
      }

      if (listId) {
        cardFilter.list = listId;
      }

      // Due date range
      if (dueBefore || dueAfter) {
        cardFilter.dueDate = {};
        if (dueAfter)  cardFilter.dueDate.$gte = new Date(dueAfter);
        if (dueBefore) cardFilter.dueDate.$lte = new Date(dueBefore);
      }

      // Sort order
      let sortObj;
      switch (sort) {
        case "dueDate":   sortObj = { dueDate: 1 };    break;
        case "createdAt": sortObj = { createdAt: -1 }; break;
        default:          sortObj = { createdAt: -1 }; // relevance fallback
      }

      [cards, total] = await Promise.all([
        Card.find(cardFilter)
          .sort(sortObj)
          .skip(skip)
          .limit(limit)
          .select("_id title description board list priority dueDate coverColor labels assignees createdAt")
          .populate("board", "title _id")
          .populate("list",  "title _id")
          .populate("assignees", "name email avatarColor avatar")
          .lean(),
        Card.countDocuments(cardFilter),
      ]);
    }

    const pages = Math.ceil(total / limit) || 0;

    return successResponse(res, {
      boards,
      cards,
      total,
      page,
      pages,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { search };
