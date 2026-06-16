const express = require("express");
const router  = express.Router();
const {
  createList,
  getListsByBoard,
  getList,
  updateList,
  moveList,
  archiveList,
  restoreList,
  duplicateList,
  createListValidation,
  updateListValidation,
} = require("../controllers/listController");
const { protect }                   = require("../middleware/auth");
const { handleValidationErrors }    = require("../middleware/validate");

// All list routes require authentication
router.use(protect);

// ── Collection routes ──────────────────────────────────────────────────────────
router.post("/",               createListValidation, handleValidationErrors, createList);
router.get("/board/:boardId",  getListsByBoard);

// ── Single-resource routes ─────────────────────────────────────────────────────
router.get("/:listId",               getList);
router.patch("/:listId",             updateListValidation, handleValidationErrors, updateList);
router.patch("/:listId/move",        moveList);
router.patch("/:listId/restore",     restoreList);
router.post("/:listId/duplicate",    duplicateList);
router.delete("/:listId",            archiveList);

module.exports = router;
