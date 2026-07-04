const { body } = require("express-validator");
const Card  = require("../models/Card");
const List  = require("../models/List");
const Board = require("../models/Board");
const { successResponse, errorResponse } = require("../utils/response");
const {
  emitCardCreated,
  emitCardUpdated,
  emitCardMoved,
  emitCardArchived,
  emitCardRestored,
  emitCardDuplicated,
  emitCommentAdded,
  emitCommentEdited,
  emitCommentDeleted,
} = require("../socket/emitters/cardEmitter");

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Verify requesting user is a board member */
const assertBoardMember = async (boardId, userId) => {
  const board = await Board.findById(boardId);
  if (!board || board.isArchived) return { error: "Board not found.", status: 404 };
  const isMember = board.members.some(
    (m) => m.user.toString() === userId.toString()
  );
  if (!isMember) return { error: "Access denied.", status: 403 };
  return { board };
};

// ─── Validation ───────────────────────────────────────────────────────────────

exports.createCardValidation = [
  body("title")
    .trim()
    .notEmpty().withMessage("Card title is required")
    .isLength({ max: 200 }).withMessage("Title must be 200 characters or fewer"),
  body("listId").notEmpty().withMessage("listId is required"),
  body("boardId").notEmpty().withMessage("boardId is required"),
];

exports.updateCardValidation = [
  body("title")
    .optional()
    .trim()
    .notEmpty().withMessage("Title cannot be empty")
    .isLength({ max: 200 }).withMessage("Title must be 200 characters or fewer"),
  body("priority")
    .optional()
    .isIn(["none", "low", "medium", "high", "critical"])
    .withMessage("Invalid priority value"),
  body("dueDate")
    .optional({ nullable: true })
    .isISO8601().withMessage("dueDate must be a valid ISO date"),
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

    const isMember = board.members.some(
      (m) => m.user.toString() === req.user._id.toString()
    );
    if (!isMember) return errorResponse(res, "Access denied.", 403);

    // WIP limit check
    if (list.wipLimit) {
      const activeCards = await Card.countDocuments({ list: listId, isArchived: false });
      if (activeCards >= list.wipLimit) {
        return errorResponse(
          res,
          `WIP limit of ${list.wipLimit} reached for this list. Archive or move a card first.`,
          409
        );
      }
    }

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

    // Log activity
    card.activityLog.push({
      action: "created",
      by: req.user._id,
      detail: "Card created",
      at: new Date(),
    });
    await card.save();

    // Append to list's cardOrder
    list.cardOrder.push(card._id);
    await list.save();

    // Update board lastActivity
    board.lastActivity = new Date();
    await board.save();

    const populated = await card.populate("assignees", "name avatar avatarColor");

    // ── HTTP response first ───────────────────────────────────────────────────
    successResponse(res, { card: populated }, "Card created.", 201);

    // ── Broadcast to all board room members ───────────────────────────────────
    // originSocketId lets the emitting client skip its own optimistic card.
    const originSocketId = req.headers["x-socket-id"] || null;
    emitCardCreated(req.app, boardId, populated, originSocketId);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/cards/list/:listId
 * Get all active cards in a list, ordered by position
 */
exports.getCardsByList = async (req, res, next) => {
  try {
    const list = await List.findById(req.params.listId);
    if (!list || list.isArchived) return errorResponse(res, "List not found.", 404);

    const { error, status } = await assertBoardMember(list.board, req.user._id);
    if (error) return errorResponse(res, error, status);

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

    const { error, status } = await assertBoardMember(card.board, req.user._id);
    if (error) return errorResponse(res, error, status);

    return successResponse(res, { card });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/cards/:cardId
 * Update card fields (title, description, priority, dueDate, coverColor, assignees, labels)
 */
exports.updateCard = async (req, res, next) => {
  try {
    const card = await Card.findById(req.params.cardId);
    if (!card || card.isArchived) return errorResponse(res, "Card not found.", 404);

    const { error, status } = await assertBoardMember(card.board, req.user._id);
    if (error) return errorResponse(res, error, status);

    const allowed = ["title", "description", "priority", "dueDate", "coverColor", "assignees", "labels"];
    const updates = {};
    allowed.forEach((k) => {
      if (req.body[k] !== undefined) updates[k] = req.body[k];
    });

    const updated = await Card.findByIdAndUpdate(req.params.cardId, updates, {
      new: true,
      runValidators: true,
    }).populate("assignees", "name avatar avatarColor")
      .populate("comments.author", "name avatar avatarColor");

    if (!updated) return errorResponse(res, "Card not found.", 404);

    // Log activity
    updated.activityLog.push({
      action: "updated",
      by: req.user._id,
      detail: "Card updated",
      at: new Date(),
    });
    await updated.save();

    // Bump board lastActivity
    await Board.findByIdAndUpdate(updated.board, { lastActivity: new Date() });

    // ── HTTP response first ───────────────────────────────────────────────────
    successResponse(res, { card: updated }, "Card updated.");

    // ── Broadcast to all board room members ───────────────────────────────────
    const originSocketId = req.headers["x-socket-id"] || null;
    emitCardUpdated(req.app, updated.board.toString(), updated, originSocketId);
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/cards/:cardId/move
 * Move a card to a different list and/or position within the same board
 */
exports.moveCard = async (req, res, next) => {
  try {
    const { targetListId, newPosition } = req.body;
    const card = await Card.findById(req.params.cardId);
    if (!card || card.isArchived) return errorResponse(res, "Card not found.", 404);

    const { error, status } = await assertBoardMember(card.board, req.user._id);
    if (error) return errorResponse(res, error, status);

    const sourceListId = card.list.toString();
    const destListId   = targetListId || sourceListId;
    const isCrossMove  = sourceListId !== destListId;

    // ── Validate destination list ─────────────────────────────────────────────
    const destList = await List.findById(destListId);
    if (!destList || destList.isArchived) {
      return errorResponse(res, "Destination list not found.", 404);
    }

    // WIP limit guard on destination
    if (isCrossMove && destList.wipLimit) {
      const destCount = await Card.countDocuments({ list: destListId, isArchived: false });
      if (destCount >= destList.wipLimit) {
        return errorResponse(
          res,
          `WIP limit of ${destList.wipLimit} reached for the destination list.`,
          409
        );
      }
    }

    // ── Remove from source list cardOrder ─────────────────────────────────────
    await List.findByIdAndUpdate(sourceListId, { $pull: { cardOrder: card._id } });

    // ── Re-calculate positions in source list (if cross-list move) ────────────
    if (isCrossMove) {
      const srcCards = await Card.find({
        list: sourceListId,
        isArchived: false,
        _id: { $ne: card._id },
      }).sort({ position: 1 });
      await Promise.all(srcCards.map((c, idx) => Card.findByIdAndUpdate(c._id, { position: idx })));
    }

    // ── Update card ───────────────────────────────────────────────────────────
    card.list     = destListId;
    card.position = newPosition ?? 0;
    card.activityLog.push({
      action: "moved",
      by: req.user._id,
      detail: `Moved to list "${destList.title}"`,
      at: new Date(),
    });
    await card.save();

    // ── Re-calculate positions in destination list ────────────────────────────
    const destCards = await Card.find({ list: destListId, isArchived: false })
      .sort({ position: 1 });

    // Build ordered array with the moved card inserted at correct spot
    const withoutMoved = destCards.filter((c) => c._id.toString() !== card._id.toString());
    const clamped      = Math.min(newPosition ?? withoutMoved.length, withoutMoved.length);
    withoutMoved.splice(clamped, 0, card);

    await Promise.all(
      withoutMoved.map((c, idx) => Card.findByIdAndUpdate(c._id, { position: idx }))
    );

    // ── Sync destList.cardOrder ───────────────────────────────────────────────
    destList.cardOrder = withoutMoved.map((c) => c._id);
    await destList.save();

    await Board.findByIdAndUpdate(card.board, { lastActivity: new Date() });

    // ── HTTP response first ───────────────────────────────────────────────────
    successResponse(res, { card }, "Card moved.");

    // ── Broadcast to all board room members ───────────────────────────────────
    const originSocketId = req.headers["x-socket-id"] || null;
    emitCardMoved(
      req.app,
      card.board.toString(),
      {
        cardId:      card._id.toString(),
        sourceListId,
        destListId,
        newPosition: clamped,
        card,
      },
      originSocketId
    );
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/cards/:cardId/duplicate
 * Duplicate a card at the end of the same list
 */
exports.duplicateCard = async (req, res, next) => {
  try {
    const source = await Card.findById(req.params.cardId);
    if (!source || source.isArchived) return errorResponse(res, "Card not found.", 404);

    const { error, status } = await assertBoardMember(source.board, req.user._id);
    if (error) return errorResponse(res, error, status);

    const count = await Card.countDocuments({ list: source.list, isArchived: false });

    const newCard = await Card.create({
      title: `${source.title} (copy)`,
      description: source.description,
      list: source.list,
      board: source.board,
      workspace: source.workspace,
      createdBy: req.user._id,
      position: count,
      priority: source.priority,
      dueDate: source.dueDate,
      coverColor: source.coverColor,
      assignees: source.assignees,
      labels: source.labels,
      checklists: source.checklists.map((cl) => ({
        title: cl.title,
        items: cl.items.map((item) => ({ text: item.text, completed: false })),
      })),
    });

    await List.findByIdAndUpdate(source.list, { $push: { cardOrder: newCard._id } });

    const populated = await newCard.populate("assignees", "name avatar avatarColor");

    // ── HTTP response first ───────────────────────────────────────────────────
    successResponse(res, { card: populated }, "Card duplicated.", 201);

    // ── Broadcast duplicated card to room ─────────────────────────────────────
    const originSocketId = req.headers["x-socket-id"] || null;
    emitCardDuplicated(req.app, source.board.toString(), populated, originSocketId);
  } catch (err) {
    next(err);
  }
};

// ─── Comments ─────────────────────────────────────────────────────────────────

/**
 * POST /api/cards/:cardId/comments
 * Add a comment to a card
 */
exports.addComment = async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) return errorResponse(res, "Comment text is required.", 400);

    const card = await Card.findById(req.params.cardId);
    if (!card || card.isArchived) return errorResponse(res, "Card not found.", 404);

    const { error, status } = await assertBoardMember(card.board, req.user._id);
    if (error) return errorResponse(res, error, status);

    card.comments.push({ text: text.trim(), author: req.user._id });
    await card.save();
    await card.populate("comments.author", "name avatar avatarColor");

    const comment = card.comments[card.comments.length - 1];

    // ── HTTP response first ───────────────────────────────────────────────────
    successResponse(res, { comment }, "Comment added.", 201);

    // ── Broadcast new comment to board room ───────────────────────────────────
    const originSocketId = req.headers["x-socket-id"] || null;
    emitCommentAdded(req.app, card.board.toString(), card._id.toString(), comment, originSocketId);
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/cards/:cardId/comments/:commentId
 * Edit an existing comment (only by the original author)
 */
exports.editComment = async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) return errorResponse(res, "Comment text is required.", 400);

    const card = await Card.findById(req.params.cardId);
    if (!card || card.isArchived) return errorResponse(res, "Card not found.", 404);

    const comment = card.comments.id(req.params.commentId);
    if (!comment) return errorResponse(res, "Comment not found.", 404);

    if (comment.author.toString() !== req.user._id.toString()) {
      return errorResponse(res, "You can only edit your own comments.", 403);
    }

    comment.text     = text.trim();
    comment.isEdited = true;
    comment.editedAt = new Date();
    await card.save();
    await card.populate("comments.author", "name avatar avatarColor");

    const updated = card.comments.id(req.params.commentId);

    // ── HTTP response first ───────────────────────────────────────────────────
    successResponse(res, { comment: updated }, "Comment updated.");

    // ── Broadcast edited comment to board room ────────────────────────────────
    const originSocketId = req.headers["x-socket-id"] || null;
    emitCommentEdited(req.app, card.board.toString(), card._id.toString(), updated, originSocketId);
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/cards/:cardId/comments/:commentId
 * Delete a comment (only by the original author or board admin)
 */
exports.deleteComment = async (req, res, next) => {
  try {
    const card = await Card.findById(req.params.cardId);
    if (!card || card.isArchived) return errorResponse(res, "Card not found.", 404);

    const { error, status, board } = await assertBoardMember(card.board, req.user._id);
    if (error) return errorResponse(res, error, status);

    const comment = card.comments.id(req.params.commentId);
    if (!comment) return errorResponse(res, "Comment not found.", 404);

    const isAuthor = comment.author.toString() === req.user._id.toString();
    const isAdmin  = board.members.some(
      (m) => m.user.toString() === req.user._id.toString() && m.role === "admin"
    );
    if (!isAuthor && !isAdmin) {
      return errorResponse(res, "You cannot delete this comment.", 403);
    }

    const commentId = req.params.commentId;
    comment.deleteOne();
    await card.save();

    // ── HTTP response first ───────────────────────────────────────────────────
    successResponse(res, {}, "Comment deleted.");

    // ── Broadcast deletion to board room ──────────────────────────────────────
    const originSocketId = req.headers["x-socket-id"] || null;
    emitCommentDeleted(req.app, card.board.toString(), card._id.toString(), commentId, originSocketId);
  } catch (err) {
    next(err);
  }
};

// ─── Checklists ───────────────────────────────────────────────────────────────

/**
 * POST /api/cards/:cardId/checklists
 * Add a checklist to a card
 */
exports.addChecklist = async (req, res, next) => {
  try {
    const { title } = req.body;
    const card = await Card.findById(req.params.cardId);
    if (!card || card.isArchived) return errorResponse(res, "Card not found.", 404);

    const { error, status } = await assertBoardMember(card.board, req.user._id);
    if (error) return errorResponse(res, error, status);

    card.checklists.push({ title: title?.trim() || "Checklist", items: [] });
    await card.save();

    const checklist = card.checklists[card.checklists.length - 1];
    return successResponse(res, { checklist }, "Checklist added.", 201);
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/cards/:cardId/checklists/:checklistId
 * Remove a checklist from a card
 */
exports.deleteChecklist = async (req, res, next) => {
  try {
    const card = await Card.findById(req.params.cardId);
    if (!card || card.isArchived) return errorResponse(res, "Card not found.", 404);

    const { error, status } = await assertBoardMember(card.board, req.user._id);
    if (error) return errorResponse(res, error, status);

    const checklist = card.checklists.id(req.params.checklistId);
    if (!checklist) return errorResponse(res, "Checklist not found.", 404);

    checklist.deleteOne();
    await card.save();

    return successResponse(res, {}, "Checklist deleted.");
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/cards/:cardId/checklists/:checklistId/items
 * Add an item to a checklist
 */
exports.addChecklistItem = async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) return errorResponse(res, "Item text is required.", 400);

    const card = await Card.findById(req.params.cardId);
    if (!card || card.isArchived) return errorResponse(res, "Card not found.", 404);

    const { error, status } = await assertBoardMember(card.board, req.user._id);
    if (error) return errorResponse(res, error, status);

    const checklist = card.checklists.id(req.params.checklistId);
    if (!checklist) return errorResponse(res, "Checklist not found.", 404);

    checklist.items.push({ text: text.trim(), completed: false });
    await card.save();

    const item = checklist.items[checklist.items.length - 1];
    return successResponse(res, { item }, "Checklist item added.", 201);
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/cards/:cardId/checklists/:checklistId/items/:itemId
 * Toggle or update a checklist item
 */
exports.updateChecklistItem = async (req, res, next) => {
  try {
    const card = await Card.findById(req.params.cardId);
    if (!card || card.isArchived) return errorResponse(res, "Card not found.", 404);

    const { error, status } = await assertBoardMember(card.board, req.user._id);
    if (error) return errorResponse(res, error, status);

    const checklist = card.checklists.id(req.params.checklistId);
    if (!checklist) return errorResponse(res, "Checklist not found.", 404);

    const item = checklist.items.id(req.params.itemId);
    if (!item) return errorResponse(res, "Item not found.", 404);

    if (req.body.text !== undefined)      item.text = req.body.text.trim();
    if (req.body.completed !== undefined) {
      item.completed   = req.body.completed;
      item.completedBy = req.body.completed ? req.user._id : undefined;
      item.completedAt = req.body.completed ? new Date() : undefined;
    }

    await card.save();
    return successResponse(res, { item }, "Checklist item updated.");
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/cards/:cardId/checklists/:checklistId/items/:itemId
 * Remove an item from a checklist
 */
exports.deleteChecklistItem = async (req, res, next) => {
  try {
    const card = await Card.findById(req.params.cardId);
    if (!card || card.isArchived) return errorResponse(res, "Card not found.", 404);

    const { error, status } = await assertBoardMember(card.board, req.user._id);
    if (error) return errorResponse(res, error, status);

    const checklist = card.checklists.id(req.params.checklistId);
    if (!checklist) return errorResponse(res, "Checklist not found.", 404);

    const item = checklist.items.id(req.params.itemId);
    if (!item) return errorResponse(res, "Item not found.", 404);

    item.deleteOne();
    await card.save();

    return successResponse(res, {}, "Checklist item deleted.");
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/cards/:cardId
 * Soft-archive a card
 */
exports.archiveCard = async (req, res, next) => {
  try {
    const card = await Card.findById(req.params.cardId);
    if (!card) return errorResponse(res, "Card not found.", 404);

    const { error, status } = await assertBoardMember(card.board, req.user._id);
    if (error) return errorResponse(res, error, status);

    const listId = card.list.toString();
    const boardId = card.board.toString();

    card.isArchived = true;
    await card.save();

    // Remove from list cardOrder
    await List.findByIdAndUpdate(card.list, { $pull: { cardOrder: card._id } });
    await Board.findByIdAndUpdate(card.board, { lastActivity: new Date() });

    // ── HTTP response first ───────────────────────────────────────────────────
    successResponse(res, {}, "Card archived.");

    // ── Broadcast archive event to room ──────────────────────────────────────
    const originSocketId = req.headers["x-socket-id"] || null;
    emitCardArchived(req.app, boardId, card._id.toString(), listId, originSocketId);
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/cards/:cardId/restore
 * Restore an archived card
 */
exports.restoreCard = async (req, res, next) => {
  try {
    const card = await Card.findById(req.params.cardId);
    if (!card) return errorResponse(res, "Card not found.", 404);

    const { error, status } = await assertBoardMember(card.board, req.user._id);
    if (error) return errorResponse(res, error, status);

    card.isArchived = false;
    const count = await Card.countDocuments({ list: card.list, isArchived: false });
    card.position = count;
    await card.save();

    await List.findByIdAndUpdate(card.list, { $push: { cardOrder: card._id } });
    await Board.findByIdAndUpdate(card.board, { lastActivity: new Date() });

    const populated = await card.populate("assignees", "name avatar avatarColor");

    // ── HTTP response first ───────────────────────────────────────────────────
    successResponse(res, { card: populated }, "Card restored.");

    // ── Broadcast restore event to room ──────────────────────────────────────
    const originSocketId = req.headers["x-socket-id"] || null;
    emitCardRestored(req.app, card.board.toString(), populated, originSocketId);
  } catch (err) {
    next(err);
  }
};
