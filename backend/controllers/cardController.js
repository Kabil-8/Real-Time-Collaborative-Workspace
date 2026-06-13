const { body } = require("express-validator");
const Card = require("../models/Card");
const List = require("../models/List");
const Board = require("../models/Board");
const { successResponse, errorResponse } = require("../utils/response");

// ─── Validation ───────────────────────────────────────────────────────────────

exports.createCardValidation = [
  body("title")
    .trim()
    .notEmpty().withMessage("Card title is required")
    .isLength({ max: 200 }).withMessage("Title must be 200 characters or fewer"),
  body("listId").notEmpty().withMessage("listId is required"),
  body("boardId").notEmpty().withMessage("boardId is required"),
];

// ─── Controllers ─────────────────────────────────────────────────────────────

/**
 * POST /api/cards
 * Create a new card in a list
 */
exports.createCard = async (req, res, next) => {
  try {
    const { title, listId, boardId, description, priority, dueDate, assignees } = req.body;

    const [list, board] = await Promise.all([
      List.findById(listId),
      Board.findById(boardId),
    ]);

    if (!list || list.isArchived) return errorResponse(res, "List not found.", 404);
    if (!board || board.isArchived) return errorResponse(res, "Board not found.", 404);

    // Position = last in list
    const count = await Card.countDocuments({ list: listId, isArchived: false });

    const card = await Card.create({
      title,
      description: description || "",
      list: listId,
      board: boardId,
      workspace: board.workspace,
      createdBy: req.user._id,
      position: count,
      priority: priority || "none",
      dueDate: dueDate || null,
      assignees: assignees || [],
    });

    // Append to list's cardOrder
    list.cardOrder.push(card._id);
    await list.save();

    // Update board lastActivity
    board.lastActivity = new Date();
    await board.save();

    const populated = await card.populate("assignees", "name avatar avatarColor");
    return successResponse(res, { card: populated }, "Card created.", 201);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/cards/list/:listId
 * Get all cards in a list
 */
exports.getCardsByList = async (req, res, next) => {
  try {
    const cards = await Card.find({ list: req.params.listId, isArchived: false })
      .sort({ position: 1 })
      .populate("assignees", "name avatar avatarColor")
      .populate("createdBy", "name avatar avatarColor");

    return successResponse(res, { cards });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/cards/:cardId
 * Get a single card with full details
 */
exports.getCard = async (req, res, next) => {
  try {
    const card = await Card.findById(req.params.cardId)
      .populate("assignees", "name avatar avatarColor")
      .populate("createdBy", "name avatar avatarColor")
      .populate("comments.author", "name avatar avatarColor")
      .populate("checklists.items.completedBy", "name avatar");

    if (!card || card.isArchived) return errorResponse(res, "Card not found.", 404);
    return successResponse(res, { card });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/cards/:cardId
 * Update card fields
 */
exports.updateCard = async (req, res, next) => {
  try {
    const allowed = ["title", "description", "priority", "dueDate", "coverColor", "assignees", "labels"];
    const updates = {};
    allowed.forEach((k) => {
      if (req.body[k] !== undefined) updates[k] = req.body[k];
    });

    const card = await Card.findByIdAndUpdate(req.params.cardId, updates, {
      new: true,
      runValidators: true,
    }).populate("assignees", "name avatar avatarColor");

    if (!card) return errorResponse(res, "Card not found.", 404);

    // Log activity
    card.activityLog.push({ action: "updated", by: req.user._id, detail: "Card updated", at: new Date() });
    await card.save();

    return successResponse(res, { card }, "Card updated.");
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/cards/:cardId/move
 * Move a card to a different list and/or position
 */
exports.moveCard = async (req, res, next) => {
  try {
    const { targetListId, newPosition } = req.body;
    const card = await Card.findById(req.params.cardId);
    if (!card) return errorResponse(res, "Card not found.", 404);

    const sourceListId = card.list.toString();
    const destListId = targetListId || sourceListId;

    // Remove from source list cardOrder
    await List.findByIdAndUpdate(sourceListId, { $pull: { cardOrder: card._id } });

    // Update card's list reference and position
    card.list = destListId;
    card.position = newPosition ?? 0;
    card.activityLog.push({ action: "moved", by: req.user._id, detail: `Moved to list ${destListId}`, at: new Date() });
    await card.save();

    // Add to destination list cardOrder at correct position
    const destList = await List.findById(destListId);
    if (!destList) return errorResponse(res, "Destination list not found.", 404);

    // Insert at position
    destList.cardOrder = destList.cardOrder.filter((id) => id.toString() !== card._id.toString());
    destList.cardOrder.splice(newPosition ?? destList.cardOrder.length, 0, card._id);
    await destList.save();

    return successResponse(res, { card }, "Card moved.");
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/cards/:cardId/comments
 * Add a comment to a card
 */
exports.addComment = async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) return errorResponse(res, "Comment text is required.", 400);

    const card = await Card.findById(req.params.cardId);
    if (!card) return errorResponse(res, "Card not found.", 404);

    card.comments.push({ text: text.trim(), author: req.user._id });
    await card.save();
    await card.populate("comments.author", "name avatar avatarColor");

    const comment = card.comments[card.comments.length - 1];
    return successResponse(res, { comment }, "Comment added.", 201);
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/cards/:cardId
 * Archive a card
 */
exports.archiveCard = async (req, res, next) => {
  try {
    const card = await Card.findByIdAndUpdate(
      req.params.cardId,
      { isArchived: true },
      { new: true }
    );
    if (!card) return errorResponse(res, "Card not found.", 404);

    // Remove from list cardOrder
    await List.findByIdAndUpdate(card.list, { $pull: { cardOrder: card._id } });

    return successResponse(res, {}, "Card archived.");
  } catch (err) {
    next(err);
  }
};
