const express = require("express");
const router = express.Router({ mergeParams: true }); // access to :boardId and :listId

const {
  createCard,
  getCard,
  updateCard,
  archiveCard,
  moveCard,
  reorderCards,
  addComment,
  deleteComment,
  createCardValidation,
  updateCardValidation,
  addCommentValidation,
} = require("../controllers/cardController");

const { protect, requireBoardAccess } = require("../middleware/auth");
const { handleValidationErrors } = require("../middleware/validate");

router.use(protect, requireBoardAccess);

// Board-level card operations (cross-list)
router.patch("/move", moveCard);

// List-scoped card routes
router.post("/lists/:listId/cards", createCardValidation, handleValidationErrors, createCard);
router.patch("/lists/:listId/cards/reorder", reorderCards);
router.get("/lists/:listId/cards/:cardId", getCard);
router.patch("/lists/:listId/cards/:cardId", updateCardValidation, handleValidationErrors, updateCard);
router.delete("/lists/:listId/cards/:cardId", archiveCard);

// Comments
router.post("/lists/:listId/cards/:cardId/comments", addCommentValidation, handleValidationErrors, addComment);
router.delete("/lists/:listId/cards/:cardId/comments/:commentId", deleteComment);

module.exports = router;
