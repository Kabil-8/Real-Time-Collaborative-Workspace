const { body } = require("express-validator");
const List = require("../models/List");
const Board = require("../models/Board");
const { successResponse, errorResponse } = require("../utils/response");

// ─── Validation ───────────────────────────────────────────────────────────────

exports.createListValidation = [
  body("title")
    .trim()
    .notEmpty().withMessage("List title is required")
    .isLength({ max: 100 }).withMessage("Title must be 100 characters or fewer"),
  body("boardId")
    .notEmpty().withMessage("boardId is required"),
];

// ─── Controllers ─────────────────────────────────────────────────────────────

/**
 * POST /api/lists
 * Create a new list in a board
 */
exports.createList = async (req, res, next) => {
  try {
    const { title, boardId, color } = req.body;

    const board = await Board.findById(boardId);
    if (!board || board.isArchived) {
      return errorResponse(res, "Board not found.", 404);
    }

    // Determine next position
    const count = await List.countDocuments({ board: boardId, isArchived: false });

    const list = await List.create({
      title,
      board: boardId,
      workspace: board.workspace,
      createdBy: req.user._id,
      position: count,
      color: color || null,
    });

    // Append to board's listOrder
    board.listOrder.push(list._id);
    board.lastActivity = new Date();
    await board.save();

    return successResponse(res, { list }, "List created.", 201);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/lists/board/:boardId
 * Get all lists for a board (ordered by position)
 */
exports.getListsByBoard = async (req, res, next) => {
  try {
    const { boardId } = req.params;

    const board = await Board.findById(boardId);
    if (!board || board.isArchived) {
      return errorResponse(res, "Board not found.", 404);
    }

    const lists = await List.find({ board: boardId, isArchived: false })
      .sort({ position: 1 })
      .populate({
        path: "cardOrder",
        match: { isArchived: false },
        select: "title priority dueDate assignees coverColor labels position",
        populate: { path: "assignees", select: "name avatar avatarColor" },
      });

    return successResponse(res, { lists });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/lists/:listId
 * Update list title, color, or wipLimit
 */
exports.updateList = async (req, res, next) => {
  try {
    const allowed = ["title", "color", "wipLimit"];
    const updates = {};
    allowed.forEach((k) => {
      if (req.body[k] !== undefined) updates[k] = req.body[k];
    });

    const list = await List.findByIdAndUpdate(req.params.listId, updates, {
      new: true,
      runValidators: true,
    });

    if (!list) return errorResponse(res, "List not found.", 404);

    return successResponse(res, { list }, "List updated.");
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/lists/:listId/move
 * Reorder a list within its board (update position)
 */
exports.moveList = async (req, res, next) => {
  try {
    const { newPosition } = req.body;
    if (newPosition === undefined || newPosition < 0) {
      return errorResponse(res, "newPosition is required and must be >= 0.", 400);
    }

    const list = await List.findById(req.params.listId);
    if (!list) return errorResponse(res, "List not found.", 404);

    const boardId = list.board;
    const lists = await List.find({ board: boardId, isArchived: false }).sort({ position: 1 });

    // Remove the list from its current index and insert at newPosition
    const filtered = lists.filter((l) => l._id.toString() !== list._id.toString());
    filtered.splice(newPosition, 0, list);

    // Re-assign sequential positions
    await Promise.all(
      filtered.map((l, idx) => List.findByIdAndUpdate(l._id, { position: idx }))
    );

    // Sync board.listOrder
    await Board.findByIdAndUpdate(boardId, {
      listOrder: filtered.map((l) => l._id),
      lastActivity: new Date(),
    });

    return successResponse(res, {}, "List moved.");
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/lists/:listId
 * Archive a list
 */
exports.archiveList = async (req, res, next) => {
  try {
    const list = await List.findByIdAndUpdate(
      req.params.listId,
      { isArchived: true },
      { new: true }
    );
    if (!list) return errorResponse(res, "List not found.", 404);

    // Remove from board's listOrder
    await Board.findByIdAndUpdate(list.board, {
      $pull: { listOrder: list._id },
      lastActivity: new Date(),
    });

    return successResponse(res, {}, "List archived.");
  } catch (err) {
    next(err);
  }
};
