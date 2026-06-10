const { body } = require("express-validator");
const Board = require("../models/Board");
const List = require("../models/List");
const Card = require("../models/Card");
const { successResponse, errorResponse } = require("../utils/response");

// ─── Validation ───────────────────────────────────────────────────────────────

exports.createBoardValidation = [
  body("title")
    .trim()
    .notEmpty().withMessage("Board title is required")
    .isLength({ max: 100 }).withMessage("Title must be 100 characters or fewer"),
  body("workspaceId").notEmpty().withMessage("workspaceId is required"),
];

// ─── Controllers ──────────────────────────────────────────────────────────────

/**
 * POST /api/boards
 */
exports.createBoard = async (req, res, next) => {
  try {
    const { title, description, workspaceId, background } = req.body;

    const board = await Board.create({
      title,
      description: description || "",
      workspace: workspaceId,
      createdBy: req.user._id,
      members: [{ user: req.user._id, role: "admin" }],
      background: background || {
        type: "gradient",
        value: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      },
    });

    // Seed 3 default lists
    const defaultLists = ["To Do", "In Progress", "Done"];
    const listDocs = await Promise.all(
      defaultLists.map((listTitle, idx) =>
        List.create({
          title: listTitle,
          board: board._id,
          workspace: workspaceId,
          createdBy: req.user._id,
          position: idx,
        })
      )
    );

    board.listOrder = listDocs.map((l) => l._id);
    await board.save();

    return successResponse(res, { board }, "Board created.", 201);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/boards/:boardId
 * Full board hydration: board + lists + cards
 */
exports.getBoard = async (req, res, next) => {
  try {
    const board = await Board.findById(req.params.boardId)
      .populate("createdBy", "name avatar avatarColor")
      .populate("members.user", "name email avatar avatarColor");

    if (!board || board.isArchived) {
      return errorResponse(res, "Board not found.", 404);
    }

    // Fetch all lists for this board in position order
    const lists = await List.find({ board: board._id, isArchived: false })
      .sort({ position: 1 });

    // Fetch all cards for this board in position order
    const cards = await Card.find({ board: board._id, isArchived: false })
      .populate("assignees", "name avatar avatarColor")
      .populate("createdBy", "name avatar avatarColor")
      .sort({ position: 1 });

    // Group cards by list
    const cardsByList = {};
    cards.forEach((card) => {
      const listId = card.list.toString();
      if (!cardsByList[listId]) cardsByList[listId] = [];
      cardsByList[listId].push(card);
    });

    const listsWithCards = lists.map((list) => ({
      ...list.toObject(),
      cards: cardsByList[list._id.toString()] || [],
    }));

    return successResponse(res, { board, lists: listsWithCards });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/boards/:boardId
 */
exports.updateBoard = async (req, res, next) => {
  try {
    const allowed = ["title", "description", "background", "isStarred"];
    const updates = {};
    allowed.forEach((k) => {
      if (req.body[k] !== undefined) updates[k] = req.body[k];
    });
    updates.lastActivity = new Date();

    const board = await Board.findByIdAndUpdate(req.params.boardId, updates, {
      new: true,
      runValidators: true,
    });

    if (!board) return errorResponse(res, "Board not found.", 404);
    return successResponse(res, { board }, "Board updated.");
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/boards/:boardId — archive
 */
exports.archiveBoard = async (req, res, next) => {
  try {
    await Board.findByIdAndUpdate(req.params.boardId, { isArchived: true });
    return successResponse(res, {}, "Board archived.");
  } catch (err) {
    next(err);
  }
};
