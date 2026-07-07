const express = require("express");
const router = express.Router({ mergeParams: true }); // mergeParams gives access to :boardId

const {
  createList,
  getLists,
  updateList,
  archiveList,
  reorderLists,
  createListValidation,
  updateListValidation,
} = require("../controllers/listController");

const { protect, requireBoardAccess } = require("../middleware/auth");
const { handleValidationErrors } = require("../middleware/validate");

// All list routes require auth and board membership
router.use(protect, requireBoardAccess);

// CRUD
router.get("/", getLists);
router.post("/", createListValidation, handleValidationErrors, createList);
router.patch("/reorder", reorderLists);                                             // must be before /:listId
router.patch("/:listId", updateListValidation, handleValidationErrors, updateList);
router.delete("/:listId", archiveList);

module.exports = router;
