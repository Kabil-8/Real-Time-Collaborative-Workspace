const { body } = require("express-validator");
const List  = require("../models/List");
const Card  = require("../models/Card");
const Board = require("../models/Board");
const { successResponse, errorResponse } = require("../utils/response");
const {
  emitListCreated,
  emitListUpdated,
  emitListArchived,
  emitListRestored,
  emitListDuplicated,
  emitListReordered,
} = require("../socket/emitters/listEmitter");
const {
  CacheKeys,
  TTL,
  cacheGet,
  cacheSet,
  cacheInvalidate,
  invalidateBoardCache,
} = require("../utils/cache");

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Verify the requesting user is a member of the board that owns the list.
 * Board doc is cached under board_members:{boardId} to skip redundant DB reads.
 */
const assertBoardMember = async (boardId, userId) => {
  const membersKey = CacheKeys.boardMembers(boardId);

  // Try cache first
  let board = await cacheGet(membersKey);

  if (!board) {
    // Cache miss — fetch from DB and cache the result
    board = await Board.findById(boardId);
    if (board) {
      await cacheSet(membersKey, board.toObject ? board.toObject() : board, TTL.MEMBERS);
    }
  }

  if (!board || board.isArchived) return { error: "Board not found.", status: 404 };
  const isMember = board.members.some(
    (m) => m.user.toString() === userId.toString()
  );
  if (!isMember) return { error: "Access denied.", status: 403 };

  // Re-hydrate as Mongoose doc when possible (needed for .save() callers)
  return { board: await Board.findById(boardId) };
};

// ─── Validation ───────────────────────────────────────────────────────────────

exports.createListValidation = [
  body("title")
    .trim()
    .notEmpty().withMessage("List title is required")
    .isLength({ max: 100 }).withMessage("Title must be 100 characters or fewer"),
  body("boardId")
    .notEmpty().withMessage("boardId is required"),
];

exports.updateListValidation = [
  body("title")
    .optional()
    .trim()
    .notEmpty().withMessage("Title cannot be empty")
    .isLength({ max: 100 }).withMessage("Title must be 100 characters or fewer"),
  body("wipLimit")
    .optional({ nullable: true })
    .isInt({ min: 1 }).withMessage("WIP limit must be a positive integer"),
];

// ─── Controllers ─────────────────────────────────────────────────────────────

/**
 * POST /api/lists
 * Create a new list in a board
 */
exports.createList = async (req, res, next) => {
  try {
    const { title, boardId, color } = req.body;

    const { error, status, board } = await assertBoardMember(boardId, req.user._id);
    if (error) return errorResponse(res, error, status);

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

    // ── Invalidate board & lists cache so next read is fresh ─────────────────
    await invalidateBoardCache(boardId);

    // ── HTTP response first ───────────────────────────────────────────────────
    successResponse(res, { list }, "List created.", 201);

    // ── Broadcast to all board room members ───────────────────────────────────
    const originSocketId = req.headers["x-socket-id"] || null;
    emitListCreated(req.app, boardId, list, originSocketId);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/lists/board/:boardId
 * Get all (active) lists for a board, ordered by position, with cards populated.
 * ── Cache-aside: check Redis first, fall back to MongoDB on miss ──────────────
 */
exports.getListsByBoard = async (req, res, next) => {
  try {
    const { boardId } = req.params;

    const { error, status } = await assertBoardMember(boardId, req.user._id);
    if (error) return errorResponse(res, error, status);

    const cacheKey = CacheKeys.lists(boardId);

    // ── 1. Cache read ─────────────────────────────────────────────────────────
    const cached = await cacheGet(cacheKey);
    if (cached) {
      return successResponse(res, cached);
    }

    // ── 2. DB fetch on cache miss ─────────────────────────────────────────────
    const lists = await List.find({ board: boardId, isArchived: false })
      .sort({ position: 1 })
      .populate({
        path: "cardOrder",
        match: { isArchived: false },
        select: "title priority dueDate assignees coverColor labels position checklists comments attachments",
        populate: { path: "assignees", select: "name avatar avatarColor" },
        options: { sort: { position: 1 } },
      });

    // ── 3. Populate cache ─────────────────────────────────────────────────────
    await cacheSet(cacheKey, { lists }, TTL.LISTS);

    return successResponse(res, { lists });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/lists/:listId
 * Get a single list with its cards
 */
exports.getList = async (req, res, next) => {
  try {
    const list = await List.findById(req.params.listId).populate({
      path: "cardOrder",
      match: { isArchived: false },
      select: "title priority dueDate assignees coverColor labels position",
      populate: { path: "assignees", select: "name avatar avatarColor" },
    });

    if (!list || list.isArchived) return errorResponse(res, "List not found.", 404);

    const { error, status } = await assertBoardMember(list.board, req.user._id);
    if (error) return errorResponse(res, error, status);

    return successResponse(res, { list });
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
    const list = await List.findById(req.params.listId);
    if (!list || list.isArchived) return errorResponse(res, "List not found.", 404);

    const { error, status } = await assertBoardMember(list.board, req.user._id);
    if (error) return errorResponse(res, error, status);

    const allowed = ["title", "color", "wipLimit"];
    const updates = {};
    allowed.forEach((k) => {
      if (req.body[k] !== undefined) updates[k] = req.body[k];
    });

    const updated = await List.findByIdAndUpdate(req.params.listId, updates, {
      new: true,
      runValidators: true,
    });

    // ── Invalidate board & lists cache ────────────────────────────────────────
    await invalidateBoardCache(list.board.toString());

    // ── HTTP response first ───────────────────────────────────────────────────
    successResponse(res, { list: updated }, "List updated.");

    // ── Broadcast to all board room members ───────────────────────────────────
    const originSocketId = req.headers["x-socket-id"] || null;
    emitListUpdated(req.app, list.board.toString(), updated, originSocketId);
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/lists/:listId/move
 * Reorder a list within its board (update position index)
 */
exports.moveList = async (req, res, next) => {
  try {
    const { newPosition } = req.body;
    if (newPosition === undefined || newPosition < 0) {
      return errorResponse(res, "newPosition is required and must be >= 0.", 400);
    }

    const list = await List.findById(req.params.listId);
    if (!list || list.isArchived) return errorResponse(res, "List not found.", 404);

    const { error, status, board } = await assertBoardMember(list.board, req.user._id);
    if (error) return errorResponse(res, error, status);

    const boardId = list.board;
    const lists   = await List.find({ board: boardId, isArchived: false }).sort({ position: 1 });

    // Remove current, splice at new index
    const filtered = lists.filter((l) => l._id.toString() !== list._id.toString());
    const clamped  = Math.min(newPosition, filtered.length);
    filtered.splice(clamped, 0, list);

    // Re-assign sequential positions
    await Promise.all(
      filtered.map((l, idx) => List.findByIdAndUpdate(l._id, { position: idx }))
    );

    // Sync board.listOrder
    await Board.findByIdAndUpdate(boardId, {
      listOrder: filtered.map((l) => l._id),
      lastActivity: new Date(),
    });

    // ── Invalidate board & lists cache ────────────────────────────────────────
    await invalidateBoardCache(boardId.toString());

    // ── HTTP response first ───────────────────────────────────────────────────
    successResponse(res, {}, "List moved.");

    // ── Broadcast reorder to board room ─────────────────────────────────────
    const originSocketId = req.headers["x-socket-id"] || null;
    emitListReordered(req.app, boardId.toString(), list._id.toString(), list.position, clamped, originSocketId);
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/lists/:listId
 * Soft-archive a list (and its cards)
 */
exports.archiveList = async (req, res, next) => {
  try {
    const list = await List.findById(req.params.listId);
    if (!list) return errorResponse(res, "List not found.", 404);

    const { error, status } = await assertBoardMember(list.board, req.user._id);
    if (error) return errorResponse(res, error, status);

    // Archive the list itself
    list.isArchived = true;
    await list.save();

    // Archive all cards in the list
    await Card.updateMany({ list: list._id }, { isArchived: true });

    // Remove from board's listOrder
    await Board.findByIdAndUpdate(list.board, {
      $pull: { listOrder: list._id },
      lastActivity: new Date(),
    });

    // ── Invalidate board & lists cache ────────────────────────────────────────
    await invalidateBoardCache(list.board.toString());

    // ── HTTP response first ───────────────────────────────────────────────────
    successResponse(res, {}, "List archived.");

    // ── Broadcast archive to board room ─────────────────────────────────────
    const originSocketId = req.headers["x-socket-id"] || null;
    emitListArchived(req.app, list.board.toString(), list._id.toString(), originSocketId);
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/lists/:listId/restore
 * Restore an archived list (and its cards)
 */
exports.restoreList = async (req, res, next) => {
  try {
    const list = await List.findById(req.params.listId);
    if (!list) return errorResponse(res, "List not found.", 404);

    const { error, status, board } = await assertBoardMember(list.board, req.user._id);
    if (error) return errorResponse(res, error, status);

    list.isArchived = false;
    // Re-assign position at end
    const count = await List.countDocuments({ board: list.board, isArchived: false });
    list.position = count;
    await list.save();

    // Restore cards that belong to this list
    await Card.updateMany({ list: list._id }, { isArchived: false });

    // Append to board.listOrder
    board.listOrder.push(list._id);
    board.lastActivity = new Date();
    await board.save();

    const populated = await List.findById(list._id).populate({
      path: "cardOrder",
      match: { isArchived: false },
      select: "title priority dueDate assignees coverColor labels position",
      populate: { path: "assignees", select: "name avatar avatarColor" },
    });

    // ── Invalidate board & lists cache ────────────────────────────────────────
    await invalidateBoardCache(list.board.toString());

    // ── HTTP response first ───────────────────────────────────────────────────
    successResponse(res, { list: populated }, "List restored.");

    // ── Broadcast restore to board room ─────────────────────────────────────
    const originSocketId = req.headers["x-socket-id"] || null;
    emitListRestored(req.app, list.board.toString(), populated, originSocketId);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/lists/:listId/duplicate
 * Duplicate a list (creates new list + copies all active cards)
 */
exports.duplicateList = async (req, res, next) => {
  try {
    const source = await List.findById(req.params.listId);
    if (!source || source.isArchived) return errorResponse(res, "List not found.", 404);

    const { error, status, board } = await assertBoardMember(source.board, req.user._id);
    if (error) return errorResponse(res, error, status);

    // Count active lists for new position
    const count = await List.countDocuments({ board: source.board, isArchived: false });

    const newList = await List.create({
      title: `${source.title} (copy)`,
      board: source.board,
      workspace: source.workspace,
      createdBy: req.user._id,
      position: count,
      color: source.color,
      wipLimit: source.wipLimit,
    });

    // Fetch source cards and duplicate them
    const sourceCards = await Card.find({ list: source._id, isArchived: false }).sort({ position: 1 });
    const newCardIds  = [];

    for (let i = 0; i < sourceCards.length; i++) {
      const sc = sourceCards[i];
      const newCard = await Card.create({
        title: sc.title,
        description: sc.description,
        list: newList._id,
        board: sc.board,
        workspace: sc.workspace,
        createdBy: req.user._id,
        position: i,
        priority: sc.priority,
        dueDate: sc.dueDate,
        coverColor: sc.coverColor,
        assignees: sc.assignees,
        labels: sc.labels,
        checklists: sc.checklists.map((cl) => ({
          title: cl.title,
          items: cl.items.map((item) => ({ text: item.text, completed: false })),
        })),
      });
      newCardIds.push(newCard._id);
    }

    newList.cardOrder = newCardIds;
    await newList.save();

    board.listOrder.push(newList._id);
    board.lastActivity = new Date();
    await board.save();

    const populated = await List.findById(newList._id).populate({
      path: "cardOrder",
      select: "title priority dueDate assignees coverColor labels position",
      populate: { path: "assignees", select: "name avatar avatarColor" },
    });

    // ── Invalidate board & lists cache ────────────────────────────────────────
    await invalidateBoardCache(source.board.toString());

    // ── HTTP response first ───────────────────────────────────────────────────
    successResponse(res, { list: populated }, "List duplicated.", 201);

    // ── Broadcast duplicated list to board room ──────────────────────────────
    const originSocketId = req.headers["x-socket-id"] || null;
    emitListDuplicated(req.app, source.board.toString(), populated, originSocketId);
  } catch (err) {
    next(err);
  }
};
