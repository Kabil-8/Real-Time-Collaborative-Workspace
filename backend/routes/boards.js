const express = require("express");
const { body } = require("express-validator");
const validate = require("../middleware/validate");
const { protect, requireWorkspaceMember } = require("../middleware/auth");
const ctrl = require("../controllers/boardController");

const router = express.Router();
router.use(protect);

// Boards
router.post(
  "/workspace/:workspaceId",
  requireWorkspaceMember,
  [
    body("name").isString().trim().isLength({ min: 1, max: 120 }),
    body("description").optional().isString().isLength({ max: 500 }),
  ],
  validate,
  ctrl.createBoard
);

router.get(
  "/workspace/:workspaceId",
  requireWorkspaceMember,
  ctrl.listBoardsForWorkspace
);

router.get("/:id/full", ctrl.getBoardFull);
router.patch("/:id", ctrl.updateBoard);
router.delete("/:id", ctrl.deleteBoard);

// Lists
router.post(
  "/lists",
  [
    body("boardId").isString().notEmpty(),
    body("title").isString().trim().isLength({ min: 1, max: 120 }),
  ],
  validate,
  ctrl.createList
);
router.patch("/lists/:listId", ctrl.updateList);
router.delete("/lists/:listId", ctrl.deleteList);
router.patch(
  "/lists/:listId/reorder",
  [body("newIndex").isInt({ min: 0 })],
  validate,
  ctrl.moveList
);

// Cards
router.post(
  "/cards",
  [
    body("listId").isString().notEmpty(),
    body("title").isString().trim().isLength({ min: 1, max: 240 }),
  ],
  validate,
  ctrl.createCard
);
router.patch("/cards/:cardId", ctrl.updateCard);
router.delete("/cards/:cardId", ctrl.deleteCard);
router.get("/cards/:cardId/comments", ctrl.getCardComments);
router.post(
  "/cards/:cardId/comments",
  [body("body").isString().trim().isLength({ min: 1, max: 2000 })],
  validate,
  ctrl.createComment
);
router.patch(
  "/cards/:cardId/move",
  [
    body("targetListId").isString().notEmpty(),
    body("newIndex").isInt({ min: 0 }),
  ],
  validate,
  ctrl.moveCard
);

module.exports = router;
