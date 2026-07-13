const Board = require("../models/Board");
const List = require("../models/List");
const Card = require("../models/Card");
const Comment = require("../models/Comment");
const Notification = require("../models/Notification");
const Workspace = require("../models/Workspace");
const { successResponse, errorResponse } = require("../utils/response");
const { orderBetween, needsRebalance, ORDER_STEP } = require("../utils/order");

function emit(req, boardId, event, payload) {
  const io = req.app.get("io");
  if (io) io.to(`board:${boardId}`).emit(event, payload);
}

async function assertBoardAccess(userId, boardId) {
  const board = await Board.findById(boardId).lean();
  if (!board) return { error: { status: 404, message: "Board not found" } };
  const ws = await Workspace.findById(board.workspaceId).lean();
  if (!ws) return { error: { status: 404, message: "Workspace not found" } };
  const isMember = ws.members.some((m) => String(m.userId) === String(userId));
  if (!isMember) return { error: { status: 403, message: "Not a workspace member" } };
  return { board };
}

async function createBoard(req, res, next) {
  try {
    const { name, description = "" } = req.body;
    const board = await Board.create({
      workspaceId: req.workspace._id,
      name,
      description,
      createdBy: req.userId,
    });
    return successResponse(res, { board }, 201);
  } catch (err) {
    next(err);
  }
}

async function listBoardsForWorkspace(req, res, next) {
  try {
    const boards = await Board.find({ workspaceId: req.workspace._id })
      .sort({ createdAt: -1 })
      .lean();
    return successResponse(res, { boards });
  } catch (err) {
    next(err);
  }
}

async function getBoardFull(req, res, next) {
  try {
    const { board, error } = await assertBoardAccess(req.userId, req.params.id);
    if (error) return errorResponse(res, error.message, error.status);
    const [lists, cards] = await Promise.all([
      List.find({ boardId: board._id }).sort({ order: 1 }).lean(),
      Card.find({ boardId: board._id }).sort({ order: 1 }).lean(),
    ]);
    return successResponse(res, { board, lists, cards });
  } catch (err) {
    next(err);
  }
}

async function updateBoard(req, res, next) {
  try {
    const { board, error } = await assertBoardAccess(req.userId, req.params.id);
    if (error) return errorResponse(res, error.message, error.status);
    const { name, description } = req.body;
    const patch = {};
    if (name !== undefined) patch.name = name;
    if (description !== undefined) patch.description = description;
    const updated = await Board.findByIdAndUpdate(board._id, patch, { new: true });
    return successResponse(res, { board: updated });
  } catch (err) {
    next(err);
  }
}

async function deleteBoard(req, res, next) {
  try {
    const { board, error } = await assertBoardAccess(req.userId, req.params.id);
    if (error) return errorResponse(res, error.message, error.status);
    await Promise.all([
      Board.deleteOne({ _id: board._id }),
      List.deleteMany({ boardId: board._id }),
      Card.deleteMany({ boardId: board._id }),
      Comment.deleteMany({ boardId: board._id }),
    ]);
    return successResponse(res, { ok: true });
  } catch (err) {
    next(err);
  }
}

// Lists
async function createList(req, res, next) {
  try {
    const { boardId, title } = req.body;
    const { error } = await assertBoardAccess(req.userId, boardId);
    if (error) return errorResponse(res, error.message, error.status);
    const last = await List.findOne({ boardId }).sort({ order: -1 }).lean();
    const order = orderBetween(last ? last.order : null, null);
    const list = await List.create({ boardId, title, order });
    emit(req, boardId, "list:created", { list });
    return successResponse(res, { list }, 201);
  } catch (err) {
    next(err);
  }
}

async function updateList(req, res, next) {
  try {
    const list = await List.findById(req.params.listId);
    if (!list) return errorResponse(res, "List not found", 404);
    const { error } = await assertBoardAccess(req.userId, list.boardId);
    if (error) return errorResponse(res, error.message, error.status);
    const { title, order } = req.body;
    if (title !== undefined) list.title = title;
    if (order !== undefined) list.order = order;
    await list.save();
    emit(req, list.boardId, "list:updated", { list });
    return successResponse(res, { list });
  } catch (err) {
    next(err);
  }
}

async function deleteList(req, res, next) {
  try {
    const list = await List.findById(req.params.listId);
    if (!list) return errorResponse(res, "List not found", 404);
    const { error } = await assertBoardAccess(req.userId, list.boardId);
    if (error) return errorResponse(res, error.message, error.status);
    const cardIds = await Card.find({ listId: list._id }).distinct("_id");
    await Promise.all([
      List.deleteOne({ _id: list._id }),
      Card.deleteMany({ listId: list._id }),
      Comment.deleteMany({ cardId: { $in: cardIds } }),
    ]);
    emit(req, list.boardId, "list:deleted", { listId: String(list._id) });
    return successResponse(res, { ok: true });
  } catch (err) {
    next(err);
  }
}

async function moveList(req, res, next) {
  try {
    const list = await List.findById(req.params.listId);
    if (!list) return errorResponse(res, "List not found", 404);
    const { error } = await assertBoardAccess(req.userId, list.boardId);
    if (error) return errorResponse(res, error.message, error.status);

    const siblings = await List.find({
      boardId: list.boardId,
      _id: { $ne: list._id },
    })
      .sort({ order: 1 })
      .select({ _id: 1, order: 1 })
      .lean();
    const index = Math.max(0, Math.min(req.body.newIndex, siblings.length));
    const previous = index > 0 ? siblings[index - 1].order : null;
    const next = index < siblings.length ? siblings[index].order : null;

    list.order = orderBetween(previous, next);
    await list.save();

    if (needsRebalance(previous, next)) {
      const all = await List.find({ boardId: list.boardId }).sort({ order: 1 });
      for (let i = 0; i < all.length; i += 1) {
        all[i].order = (i + 1) * ORDER_STEP;
        await all[i].save();
      }
      emit(req, list.boardId, "board:reload", {});
    }

    emit(req, list.boardId, "list:updated", { list });
    return successResponse(res, { list });
  } catch (err) {
    next(err);
  }
}

// Cards
async function createCard(req, res, next) {
  try {
    const { listId, title, description = "" } = req.body;
    const list = await List.findById(listId).lean();
    if (!list) return errorResponse(res, "List not found", 404);
    const { error } = await assertBoardAccess(req.userId, list.boardId);
    if (error) return errorResponse(res, error.message, error.status);
    const last = await Card.findOne({ listId }).sort({ order: -1 }).lean();
    const order = orderBetween(last ? last.order : null, null);
    const card = await Card.create({
      boardId: list.boardId,
      listId,
      title,
      description,
      order,
      createdBy: req.userId,
    });
    emit(req, list.boardId, "card:created", { card });
    return successResponse(res, { card }, 201);
  } catch (err) {
    next(err);
  }
}

async function updateCard(req, res, next) {
  try {
    const card = await Card.findById(req.params.cardId);
    if (!card) return errorResponse(res, "Card not found", 404);
    const { board, error } = await assertBoardAccess(req.userId, card.boardId);
    if (error) return errorResponse(res, error.message, error.status);
    const allowed = ["title", "description", "labels", "dueDate", "assigneeIds"];
    for (const key of allowed) {
      if (req.body[key] !== undefined) card[key] = req.body[key];
    }
    await card.save();
    emit(req, card.boardId, "card:updated", { card });
    return successResponse(res, { card });
  } catch (err) {
    next(err);
  }
}

async function deleteCard(req, res, next) {
  try {
    const card = await Card.findById(req.params.cardId);
    if (!card) return errorResponse(res, "Card not found", 404);
    const { board, error } = await assertBoardAccess(req.userId, card.boardId);
    if (error) return errorResponse(res, error.message, error.status);
    await Promise.all([
      Card.deleteOne({ _id: card._id }),
      Comment.deleteMany({ cardId: card._id }),
    ]);
    emit(req, card.boardId, "card:deleted", { cardId: String(card._id), listId: String(card.listId) });
    return successResponse(res, { ok: true });
  } catch (err) {
    next(err);
  }
}

async function getCardComments(req, res, next) {
  try {
    const card = await Card.findById(req.params.cardId).lean();
    if (!card) return errorResponse(res, "Card not found", 404);
    const { error } = await assertBoardAccess(req.userId, card.boardId);
    if (error) return errorResponse(res, error.message, error.status);
    const comments = await Comment.find({ cardId: card._id })
      .sort({ createdAt: 1 })
      .populate("authorId", "name avatarUrl")
      .lean();
    return successResponse(res, { comments });
  } catch (err) {
    next(err);
  }
}

async function createComment(req, res, next) {
  try {
    const card = await Card.findById(req.params.cardId).lean();
    if (!card) return errorResponse(res, "Card not found", 404);
    const { board, error } = await assertBoardAccess(req.userId, card.boardId);
    if (error) return errorResponse(res, error.message, error.status);
    const comment = await Comment.create({
      boardId: card.boardId,
      cardId: card._id,
      authorId: req.userId,
      body: req.body.body,
    });
    await comment.populate("authorId", "name avatarUrl");
    const recipients = [...new Set([
      ...card.assigneeIds.map(String),
      String(card.createdBy),
    ])].filter((userId) => userId !== String(req.userId));
    if (recipients.length) {
      await Notification.insertMany(recipients.map((userId) => ({
        userId,
        workspaceId: board.workspaceId,
        boardId: card.boardId,
        cardId: card._id,
        type: "comment",
        message: `${comment.authorId.name} commented on “${card.title}”`,
      })));
    }
    emit(req, card.boardId, "comment:created", { comment });
    return successResponse(res, { comment }, 201);
  } catch (err) {
    next(err);
  }
}

async function moveCard(req, res, next) {
  try {
    const card = await Card.findById(req.params.cardId);
    if (!card) return errorResponse(res, "Card not found", 404);
    const { error } = await assertBoardAccess(req.userId, card.boardId);
    if (error) return errorResponse(res, error.message, error.status);
    const { targetListId, newIndex } = req.body;
    const targetList = await List.findById(targetListId).lean();
    if (!targetList) return errorResponse(res, "Target list not found", 404);
    if (String(targetList.boardId) !== String(card.boardId)) {
      return errorResponse(res, "Cannot move card across boards", 400);
    }
    const siblings = await Card.find({
      listId: targetListId,
      _id: { $ne: card._id },
    })
      .sort({ order: 1 })
      .select({ _id: 1, order: 1 })
      .lean();
    const idx = Math.max(0, Math.min(newIndex, siblings.length));
    const prev = idx > 0 ? siblings[idx - 1].order : null;
    const next = idx < siblings.length ? siblings[idx].order : null;
    card.listId = targetList._id;
    card.order = orderBetween(prev, next);
    await card.save();
    if (needsRebalance(prev, next)) {
      const all = await Card.find({ listId: targetListId }).sort({ order: 1 });
      for (let i = 0; i < all.length; i++) {
        all[i].order = (i + 1) * ORDER_STEP;
        await all[i].save();
      }
      emit(req, card.boardId, "board:reload", {});
    }
    emit(req, card.boardId, "card:moved", { card });
    return successResponse(res, { card });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createBoard,
  listBoardsForWorkspace,
  getBoardFull,
  updateBoard,
  deleteBoard,
  createList,
  updateList,
  deleteList,
  moveList,
  createCard,
  updateCard,
  deleteCard,
  moveCard,
  getCardComments,
  createComment,
};
