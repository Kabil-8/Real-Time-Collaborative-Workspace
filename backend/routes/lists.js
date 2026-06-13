const express = require("express");
const router = express.Router();
const {
  createList,
  getListsByBoard,
  updateList,
  moveList,
  archiveList,
  createListValidation,
} = require("../controllers/listController");
const { protect } = require("../middleware/auth");
const { handleValidationErrors } = require("../middleware/validate");

// All list routes require authentication
router.use(protect);

router.post("/", createListValidation, handleValidationErrors, createList);
router.get("/board/:boardId", getListsByBoard);
router.patch("/:listId", updateList);
router.patch("/:listId/move", moveList);
router.delete("/:listId", archiveList);

module.exports = router;
