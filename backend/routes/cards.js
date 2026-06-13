const express = require("express");
const router = express.Router();
const {
  createCard,
  getCardsByList,
  getCard,
  updateCard,
  moveCard,
  addComment,
  archiveCard,
  createCardValidation,
} = require("../controllers/cardController");
const { protect } = require("../middleware/auth");
const { handleValidationErrors } = require("../middleware/validate");

// All card routes require authentication
router.use(protect);

router.post("/", createCardValidation, handleValidationErrors, createCard);
router.get("/list/:listId", getCardsByList);
router.get("/:cardId", getCard);
router.patch("/:cardId", updateCard);
router.patch("/:cardId/move", moveCard);
router.post("/:cardId/comments", addComment);
router.delete("/:cardId", archiveCard);

module.exports = router;
