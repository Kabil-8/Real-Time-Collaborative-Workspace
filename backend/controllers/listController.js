const { body, param } = require("express-validator");
const List = require("../models/List");
const Card = require("../models/Card");
const Board = require("../models/Board");
const { successResponse, errorResponse } = require("../utils/response");
const { delCache } = require("../config/redis");

/** Invalidate the board-level Redis cache key */
const invalidateBoardCache = async (boardId) => delCache(`board:${boardId}`);

// ─── Validation ───────────────────────────────────────────────────────────────

exports.createListValidation = [
  body("title")
    .trim()
    .notEmpty().withMessage("List title is required")
    .isLength({ max: 100 }).withMessage("Title must be 100 chars or fewer"),
];

exports.updateListValidation = [
  body("title")
    .optional()
    .trim()
    .notEmpty().withMessage("Title cannot be empty")
    .isLength({ max: 100 }),
  body("wipLimit")
    .optional()
    .isInt({ min: 1, max: 999 }).withMessage("WIP limit must be between 1 and 999"),
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Re-normalise position values across all lists on a board.
 * Call after any position mutation to keep integers gapless.
 */
const normalisePositions = async (boardId, session = null) => {
  const lists = await List.find({ board: boardId, isArchived: false })
    .sort({ position: 1 })
    .session(session);

  const updates = lists.map((l, i) =>
    List.updateOne({ _id: l._id }, { position: i }, { session })
  );
  await Promise.all(updates);
};

// ─── Controllers ──────────────────────────────────────────────────────────────

/**
 * POST /api/boards/:boardId/lists
 */
exports.createList = async (req, res, next) => {
  try {
    const { boardId } = req.params;
    const { title, color = null, wipLimit = null } = req.body;

    // Count existing lists to determine position
    const count = await List.countDocuments({ board: boardId, isArchived: false });

    const list = await List.create({
      title,
      board: boardId,
      workspace: req.board.workspace,
      createdBy: req.user._id,
      position: count,
      color,
      wipLimit,
    });

    // Push to board's listOrder
    await Board.findByIdAndUpdate(boardId, {
      $push: { listOrder: list._id },
      lastActivity: new Date(),
    });

    // Emit real-time event
    const io = req.app.get("io");
    if (io) io.to(`board:${boardId}`).emit("list:created", { list });

    await invalidateBoardCache(boardId);
    return successResponse(res, { list }, "List created.", 201);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/boards/:boardId/lists
 * Returns all lists with their cards grouped in.
 */
exports.getLists = async (req, res, next) => {
  try {
    const { boardId } = req.params;

    const lists = await List.find({ board: boardId, isArchived: false })
      .populate("createdBy", "name avatar avatarColor")
      .sort({ position: 1 });

    const cards = await Card.find({ board: boardId, isArchived: false })
      .populate("assignees", "name avatar avatarColor")
      .populate("createdBy", "name avatar avatarColor")
      .sort({ position: 1 });

    const cardsByList = {};
    cards.forEach((c) => {
      const lid = c.list.toString();
      if (!cardsByList[lid]) cardsByList[lid] = [];
      cardsByList[lid].push(c);
    });

    const listsWithCards = lists.map((l) => ({
      ...l.toObject(),
      cards: cardsByList[l._id.toString()] || [],
    }));

    return successResponse(res, { lists: listsWithCards });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/boards/:boardId/lists/:listId
 */
exports.updateList = async (req, res, next) => {
  try {
    const { listId, boardId } = req.params;
    const allowed = ["title", "color", "wipLimit"];
    const updates = {};
    allowed.forEach((k) => {
      if (req.body[k] !== undefined) updates[k] = req.body[k];
    });

    const list = await List.findOneAndUpdate(
      { _id: listId, board: boardId, isArchived: false },
      updates,
      { new: true, runValidators: true }
    );

    if (!list) return errorResponse(res, "List not found.", 404);

    await Board.findByIdAndUpdate(boardId, { lastActivity: new Date() });

    const io = req.app.get("io");
    if (io) io.to(`board:${boardId}`).emit("list:updated", { list });

    await invalidateBoardCache(boardId);
    return successResponse(res, { list }, "List updated.");
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/boards/:boardId/lists/:listId
 * Soft-delete (archive) the list and all its cards.
 */
exports.archiveList = async (req, res, next) => {
  try {
    const { listId, boardId } = req.params;

    const list = await List.findOneAndUpdate(
      { _id: listId, board: boardId },
      { isArchived: true },
      { new: true }
    );

    if (!list) return errorResponse(res, "List not found.", 404);

    // Archive all cards in the list
    await Card.updateMany({ list: listId }, { isArchived: true });

    // Remove from board's listOrder
    await Board.findByIdAndUpdate(boardId, {
      $pull: { listOrder: list._id },
      lastActivity: new Date(),
    });

    await normalisePositions(boardId);

    const io = req.app.get("io");
    if (io) io.to(`board:${boardId}`).emit("list:archived", { listId });

    await invalidateBoardCache(boardId);
    return successResponse(res, {}, "List archived.");
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/boards/:boardId/lists/reorder
 * Body: { orderedIds: ["listId1", "listId2", ...] }
 * Persists list order after a DnD reorder.
 */
exports.reorderLists = async (req, res, next) => {
  try {
    const { boardId } = req.params;
    const { orderedIds } = req.body;

    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      return errorResponse(res, "orderedIds must be a non-empty array.", 400);
    }

    // Batch update positions
    await Promise.all(
      orderedIds.map((id, index) =>
        List.updateOne(
          { _id: id, board: boardId, isArchived: false },
          { position: index }
        )
      )
    );

    // Keep board listOrder in sync
    await Board.findByIdAndUpdate(boardId, {
      listOrder: orderedIds,
      lastActivity: new Date(),
    });

    const io = req.app.get("io");
    if (io) io.to(`board:${boardId}`).emit("lists:reordered", { orderedIds });

    await invalidateBoardCache(boardId);
    return successResponse(res, { orderedIds }, "Lists reordered.");
  } catch (err) {
    next(err);
  }
};
