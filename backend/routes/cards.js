const express = require("express");
const router  = express.Router();
const {
  createCard,
  getCardsByList,
  getCard,
  updateCard,
  moveCard,
  duplicateCard,
  addComment,
  editComment,
  deleteComment,
  addChecklist,
  deleteChecklist,
  addChecklistItem,
  updateChecklistItem,
  deleteChecklistItem,
  archiveCard,
  restoreCard,
  createCardValidation,
  updateCardValidation,
} = require("../controllers/cardController");
const { protect }                = require("../middleware/auth");
const { handleValidationErrors } = require("../middleware/validate");

// All card routes require authentication
router.use(protect);

// ── Collection routes ──────────────────────────────────────────────────────────
router.post("/",               createCardValidation, handleValidationErrors, createCard);
router.get("/list/:listId",    getCardsByList);

// ── Single-card routes ─────────────────────────────────────────────────────────
router.get("/:cardId",               getCard);
router.patch("/:cardId",             updateCardValidation, handleValidationErrors, updateCard);
router.patch("/:cardId/move",        moveCard);
router.post("/:cardId/duplicate",    duplicateCard);
router.patch("/:cardId/restore",     restoreCard);
router.delete("/:cardId",            archiveCard);

// ── Comment routes ─────────────────────────────────────────────────────────────
router.post("/:cardId/comments",                   addComment);
router.patch("/:cardId/comments/:commentId",       editComment);
router.delete("/:cardId/comments/:commentId",      deleteComment);

// ── Checklist routes ───────────────────────────────────────────────────────────
router.post("/:cardId/checklists",                                         addChecklist);
router.delete("/:cardId/checklists/:checklistId",                          deleteChecklist);
router.post("/:cardId/checklists/:checklistId/items",                      addChecklistItem);
router.patch("/:cardId/checklists/:checklistId/items/:itemId",             updateChecklistItem);
router.delete("/:cardId/checklists/:checklistId/items/:itemId",            deleteChecklistItem);

module.exports = router;
