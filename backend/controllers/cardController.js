const { body } = require("express-validator");
const Card = require("../models/Card");
const List = require("../models/List");
const Board = require("../models/Board");
const Notification = require("../models/Notification");
const { successResponse, errorResponse } = require("../utils/response");
const { delCache } = require("../config/redis");

// ─── Validation ───────────────────────────────────────────────────────────────

exports.createCardValidation = [
  body("title")
    .trim()
    .notEmpty().withMessage("Card title is required")
    .isLength({ max: 200 }).withMessage("Title must be 200 chars or fewer"),
];

exports.updateCardValidation = [
  body("title")
    .optional()
    .trim()
    .notEmpty().withMessage("Title cannot be empty")
    .isLength({ max: 200 }),
  body("priority")
    .optional()
    .isIn(["none", "low", "medium", "high", "critical"])
    .withMessage("Invalid priority value"),
  body("dueDate")
    .optional({ nullable: true })
    .isISO8601().withMessage("dueDate must be a valid ISO date"),
];

exports.addCommentValidation = [
  body("text")
    .trim()
    .notEmpty().withMessage("Comment text is required")
    .isLength({ max: 2000 }),
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const normaliseCardPositions = async (listId) => {
  const cards = await Card.find({ list: listId, isArchived: false }).sort({ position: 1 });
  await Promise.all(cards.map((c, i) => Card.updateOne({ _id: c._id }, { position: i })));
};

const emitBoardEvent = (req, event, payload) => {
  const io = req.app.get("io");
  if (io) io.to(`board:${req.params.boardId}`).emit(event, payload);
};

/** Invalidate the full-board Redis cache whenever cards change */
const invalidateBoardCache = async (boardId) => {
  await delCache(`board:${boardId}`);
};

/**
 * Send notifications to a list of recipients (excluding the actor).
 * @param {object} io
 * @param {string} actorId
 * @param {string[]} recipientIds
 * @param {object} notifData - { type, title, message, link, meta }
 */
const notifyUsers = async (io, actorId, recipientIds, notifData) => {
  const uniqueRecipients = [...new Set(
    recipientIds.map((r) => r.toString()).filter((r) => r !== actorId.toString())
  )];

  await Promise.all(
    uniqueRecipients.map((recipientId) =>
      Notification.createAndEmit(io, {
        recipient: recipientId,
        actor: actorId,
        ...notifData,
      })
    )
  );
};

// ─── Controllers ──────────────────────────────────────────────────────────────

/**
 * POST /api/boards/:boardId/lists/:listId/cards
 */
exports.createCard = async (req, res, next) => {
  try {
    const { boardId, listId } = req.params;
    const { title, description = "", priority = "none", dueDate = null, assignees = [] } = req.body;

    const list = await List.findOne({ _id: listId, board: boardId, isArchived: false });
    if (!list) return errorResponse(res, "List not found.", 404);

    const count = await Card.countDocuments({ list: listId, isArchived: false });

    const card = await Card.create({
      title,
      description,
      list: listId,
      board: boardId,
      workspace: req.board.workspace,
      createdBy: req.user._id,
      position: count,
      priority,
      dueDate,
      assignees,
    });

    // Add card to list's cardOrder
    await List.findByIdAndUpdate(listId, { $push: { cardOrder: card._id } });
    await Board.findByIdAndUpdate(boardId, { lastActivity: new Date() });

    const populated = await card.populate("assignees", "name avatar avatarColor");
    await populated.populate("createdBy", "name avatar avatarColor");

    emitBoardEvent(req, "card:created", { card: populated, listId });
    await invalidateBoardCache(boardId);

    // Notify assigned users
    if (assignees.length > 0) {
      const io = req.app.get("io");
      await notifyUsers(io, req.user._id, assignees, {
        type: "card_assigned",
        title: "Card Assigned to You",
        message: `${req.user.name} assigned you to "${title}"`,
        link: `/boards/${boardId}`,
        meta: { boardId, cardId: card._id, cardTitle: title },
      });
    }

    return successResponse(res, { card: populated }, "Card created.", 201);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/boards/:boardId/lists/:listId/cards/:cardId
 */
exports.getCard = async (req, res, next) => {
  try {
    const { cardId, boardId } = req.params;

    const card = await Card.findOne({ _id: cardId, board: boardId, isArchived: false })
      .populate("assignees", "name email avatar avatarColor")
      .populate("createdBy", "name avatar avatarColor")
      .populate("comments.author", "name avatar avatarColor")
      .populate("checklists.items.completedBy", "name avatar");

    if (!card) return errorResponse(res, "Card not found.", 404);

    // Include virtual checklistProgress
    const cardObj = card.toObject({ virtuals: true });
    return successResponse(res, { card: cardObj });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/boards/:boardId/lists/:listId/cards/:cardId
 */
exports.updateCard = async (req, res, next) => {
  try {
    const { cardId, boardId } = req.params;
    const allowed = [
      "title", "description", "priority", "dueDate",
      "coverColor", "assignees", "labels", "checklists",
    ];
    const updates = {};
    allowed.forEach((k) => {
      if (req.body[k] !== undefined) updates[k] = req.body[k];
    });

    // Fetch current card to detect new assignees
    const existingCard = await Card.findOne({ _id: cardId, board: boardId, isArchived: false }).lean();
    if (!existingCard) return errorResponse(res, "Card not found.", 404);

    const card = await Card.findOneAndUpdate(
      { _id: cardId, board: boardId, isArchived: false },
      updates,
      { new: true, runValidators: true }
    )
      .populate("assignees", "name avatar avatarColor")
      .populate("createdBy", "name avatar avatarColor")
      .populate("comments.author", "name avatar avatarColor");

    if (!card) return errorResponse(res, "Card not found.", 404);

    await Board.findByIdAndUpdate(boardId, { lastActivity: new Date() });
    emitBoardEvent(req, "card:updated", { card });
    await invalidateBoardCache(boardId);

    // Notify newly added assignees
    if (updates.assignees) {
      const existingIds = (existingCard.assignees || []).map((a) => a.toString());
      const newAssignees = updates.assignees.filter(
        (id) => !existingIds.includes(id.toString())
      );
      if (newAssignees.length > 0) {
        const io = req.app.get("io");
        await notifyUsers(io, req.user._id, newAssignees, {
          type: "card_assigned",
          title: "Card Assigned to You",
          message: `${req.user.name} assigned you to "${card.title}"`,
          link: `/boards/${boardId}`,
          meta: { boardId, cardId: card._id, cardTitle: card.title },
        });
      }
    }

    return successResponse(res, { card }, "Card updated.");
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/boards/:boardId/lists/:listId/cards/:cardId
 */
exports.archiveCard = async (req, res, next) => {
  try {
    const { cardId, listId, boardId } = req.params;

    const card = await Card.findOneAndUpdate(
      { _id: cardId, board: boardId },
      { isArchived: true },
      { new: true }
    );

    if (!card) return errorResponse(res, "Card not found.", 404);

    await List.findByIdAndUpdate(listId, { $pull: { cardOrder: card._id } });
    await Board.findByIdAndUpdate(boardId, { lastActivity: new Date() });
    await normaliseCardPositions(listId);
    await invalidateBoardCache(boardId);

    emitBoardEvent(req, "card:archived", { cardId, listId });

    return successResponse(res, {}, "Card archived.");
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/boards/:boardId/cards/move
 * Body: { cardId, sourceListId, destinationListId, sourceIndex, destinationIndex }
 */
exports.moveCard = async (req, res, next) => {
  try {
    const { boardId } = req.params;
    const { cardId, sourceListId, destinationListId, destinationIndex } = req.body;

    if (!cardId || !sourceListId || !destinationListId || destinationIndex === undefined) {
      return errorResponse(res, "cardId, sourceListId, destinationListId, destinationIndex are required.", 400);
    }

    const card = await Card.findOne({ _id: cardId, board: boardId, isArchived: false });
    if (!card) return errorResponse(res, "Card not found.", 404);

    const sameList = sourceListId === destinationListId;

    if (!sameList) {
      await List.findByIdAndUpdate(sourceListId, { $pull: { cardOrder: card._id } });
      await Card.updateMany(
        { list: sourceListId, position: { $gt: card.position }, isArchived: false },
        { $inc: { position: -1 } }
      );
      await Card.updateMany(
        { list: destinationListId, position: { $gte: destinationIndex }, isArchived: false },
        { $inc: { position: 1 } }
      );

      card.list = destinationListId;
      card.position = destinationIndex;

      const destList = await List.findById(destinationListId);
      if (destList) {
        destList.cardOrder.splice(destinationIndex, 0, card._id);
        await destList.save();
      }
    } else {
      const oldPosition = card.position;
      const newPosition = destinationIndex;

      if (oldPosition < newPosition) {
        await Card.updateMany(
          { list: sourceListId, position: { $gt: oldPosition, $lte: newPosition }, isArchived: false, _id: { $ne: card._id } },
          { $inc: { position: -1 } }
        );
      } else if (oldPosition > newPosition) {
        await Card.updateMany(
          { list: sourceListId, position: { $gte: newPosition, $lt: oldPosition }, isArchived: false, _id: { $ne: card._id } },
          { $inc: { position: 1 } }
        );
      }
      card.position = newPosition;
    }

    card.activityLog.push({
      action: "moved",
      by: req.user._id,
      detail: sameList ? `Reordered within list` : `Moved to new list`,
    });

    await card.save();
    await Board.findByIdAndUpdate(boardId, { lastActivity: new Date() });

    await normaliseCardPositions(sourceListId);
    if (!sameList) await normaliseCardPositions(destinationListId);
    await invalidateBoardCache(boardId);

    const populated = await Card.findById(card._id)
      .populate("assignees", "name avatar avatarColor")
      .populate("createdBy", "name avatar avatarColor");

    emitBoardEvent(req, "card:moved", {
      card: populated,
      sourceListId,
      destinationListId,
      destinationIndex,
    });

    return successResponse(res, { card: populated }, "Card moved.");
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/boards/:boardId/lists/:listId/cards/reorder
 * Body: { orderedIds: ["cardId1", "cardId2", ...] }
 */
exports.reorderCards = async (req, res, next) => {
  try {
    const { boardId, listId } = req.params;
    const { orderedIds } = req.body;

    if (!Array.isArray(orderedIds)) {
      return errorResponse(res, "orderedIds must be an array.", 400);
    }

    await Promise.all(
      orderedIds.map((id, index) =>
        Card.updateOne({ _id: id, list: listId, isArchived: false }, { position: index })
      )
    );

    await List.findByIdAndUpdate(listId, { cardOrder: orderedIds });
    await Board.findByIdAndUpdate(boardId, { lastActivity: new Date() });
    await invalidateBoardCache(boardId);

    emitBoardEvent(req, "cards:reordered", { listId, orderedIds });

    return successResponse(res, { orderedIds }, "Cards reordered.");
  } catch (err) {
    next(err);
  }
};

// ─── Comments ─────────────────────────────────────────────────────────────────

/**
 * POST /api/boards/:boardId/lists/:listId/cards/:cardId/comments
 */
exports.addComment = async (req, res, next) => {
  try {
    const { cardId, boardId } = req.params;
    const { text } = req.body;

    const card = await Card.findOne({ _id: cardId, board: boardId, isArchived: false });
    if (!card) return errorResponse(res, "Card not found.", 404);

    card.comments.push({ text, author: req.user._id });
    await card.save();

    const updated = await Card.findById(cardId)
      .populate("comments.author", "name avatar avatarColor")
      .populate("assignees", "name avatar avatarColor");

    const comment = updated.comments[updated.comments.length - 1];
    emitBoardEvent(req, "card:comment_added", { cardId, comment });

    // Notify card creator + assignees about the new comment (excluding commenter)
    const io = req.app.get("io");
    const recipientIds = [
      card.createdBy.toString(),
      ...(card.assignees || []).map((a) => a.toString()),
    ];

    await notifyUsers(io, req.user._id, recipientIds, {
      type: "comment_added",
      title: "New Comment on Card",
      message: `${req.user.name} commented on "${card.title}": "${text.slice(0, 80)}${text.length > 80 ? "…" : ""}"`,
      link: `/boards/${boardId}`,
      meta: { boardId, cardId: card._id, cardTitle: card.title },
    });

    return successResponse(res, { comment }, "Comment added.", 201);
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/boards/:boardId/lists/:listId/cards/:cardId/comments/:commentId
 */
exports.deleteComment = async (req, res, next) => {
  try {
    const { cardId, commentId, boardId } = req.params;

    const card = await Card.findOne({ _id: cardId, board: boardId, isArchived: false });
    if (!card) return errorResponse(res, "Card not found.", 404);

    const comment = card.comments.id(commentId);
    if (!comment) return errorResponse(res, "Comment not found.", 404);

    // Only author or board admin can delete
    if (comment.author.toString() !== req.user._id.toString()) {
      const isAdmin = req.board.members.some(
        (m) => m.user.toString() === req.user._id.toString() && m.role === "admin"
      );
      if (!isAdmin) return errorResponse(res, "Not authorised to delete this comment.", 403);
    }

    comment.deleteOne();
    await card.save();

    emitBoardEvent(req, "card:comment_deleted", { cardId, commentId });

    return successResponse(res, {}, "Comment deleted.");
  } catch (err) {
    next(err);
  }
};
