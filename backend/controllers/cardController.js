const { body } = require("express-validator");
const Card = require("../models/Card");
const Board = require("../models/Board");
const List = require("../models/List");
const { successResponse, errorResponse } = require("../utils/response");

exports.createCardValidation = [
  body("title")
    .trim()
    .notEmpty()
    .withMessage("Card title is required")
    .isLength({ max: 200 })
    .withMessage("Card title must be 200 characters or fewer"),
  body("listId").notEmpty().withMessage("listId is required"),
];

exports.createCard = async (req, res, next) => {
  try {
    const { title, description, listId } = req.body;

    const list = await List.findById(listId);
    if (!list || list.isArchived) {
      return errorResponse(res, "List not found.", 404);
    }

    const board = await Board.findById(list.board);
    if (!board || board.isArchived) {
      return errorResponse(res, "Board not found.", 404);
    }

    const isBoardMember = board.members.some(
      (member) => member.user.toString() === req.user._id.toString()
    );
    if (!isBoardMember) {
      return errorResponse(res, "Access denied. You are not a member of this board.", 403);
    }

    const card = await Card.create({
      title,
      description: description || "",
      list: list._id,
      board: board._id,
      workspace: list.workspace,
      createdBy: req.user._id,
      position: list.cardOrder.length,
    });

    list.cardOrder.push(card._id);
    await list.save();

    return successResponse(res, { card }, "Card created.", 201);
  } catch (err) {
    next(err);
  }
};

exports.updateCard = async (req, res, next) => {
  try {
    const allowed = ["title", "description", "priority", "dueDate", "assignees", "labels"];
    const updates = {};
    allowed.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    const card = await Card.findByIdAndUpdate(req.params.cardId, updates, {
      new: true,
      runValidators: true,
    });

    if (!card) return errorResponse(res, "Card not found.", 404);
    return successResponse(res, { card }, "Card updated.");
  } catch (err) {
    next(err);
  }
};

exports.archiveCard = async (req, res, next) => {
  try {
    const card = await Card.findByIdAndUpdate(req.params.cardId, { isArchived: true }, { new: true });
    if (!card) return errorResponse(res, "Card not found.", 404);
    return successResponse(res, {}, "Card archived.");
  } catch (err) {
    next(err);
  }
};
