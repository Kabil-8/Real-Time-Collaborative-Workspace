const { body } = require("express-validator");
const List = require("../models/List");
const Board = require("../models/Board");
const { successResponse, errorResponse } = require("../utils/response");

exports.createListValidation = [
  body("title")
    .trim()
    .notEmpty()
    .withMessage("List title is required")
    .isLength({ max: 100 })
    .withMessage("List title must be 100 characters or fewer"),
  body("boardId").notEmpty().withMessage("boardId is required"),
];

exports.createList = async (req, res, next) => {
  try {
    const { title, boardId } = req.body;

    const board = await Board.findById(boardId);
    if (!board || board.isArchived) {
      return errorResponse(res, "Board not found.", 404);
    }

    const isBoardMember = board.members.some(
      (member) => member.user.toString() === req.user._id.toString()
    );
    if (!isBoardMember) {
      return errorResponse(res, "Access denied. You are not a member of this board.", 403);
    }

    const list = await List.create({
      title,
      board: board._id,
      workspace: board.workspace,
      createdBy: req.user._id,
      position: board.listOrder.length,
    });

    board.listOrder.push(list._id);
    await board.save();

    return successResponse(res, { list }, "List created.", 201);
  } catch (err) {
    next(err);
  }
};

exports.updateList = async (req, res, next) => {
  try {
    const updates = {};
    if (req.body.title !== undefined) updates.title = req.body.title;
    if (req.body.position !== undefined) updates.position = req.body.position;

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

exports.archiveList = async (req, res, next) => {
  try {
    const list = await List.findByIdAndUpdate(req.params.listId, { isArchived: true }, { new: true });
    if (!list) return errorResponse(res, "List not found.", 404);
    return successResponse(res, {}, "List archived.");
  } catch (err) {
    next(err);
  }
};
