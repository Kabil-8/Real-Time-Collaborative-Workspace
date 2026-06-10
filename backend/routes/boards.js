const express = require("express");
const router = express.Router();
const {
  createBoard,
  getBoard,
  updateBoard,
  archiveBoard,
  createBoardValidation,
} = require("../controllers/boardController");
const { protect, requireBoardAccess } = require("../middleware/auth");
const { handleValidationErrors } = require("../middleware/validate");

router.use(protect);

router.post("/", createBoardValidation, handleValidationErrors, createBoard);
router.get("/:boardId", requireBoardAccess, getBoard);
router.patch("/:boardId", requireBoardAccess, updateBoard);
router.delete("/:boardId", requireBoardAccess, archiveBoard);

module.exports = router;
