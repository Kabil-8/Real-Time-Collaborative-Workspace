const express = require("express");
const router = express.Router();
const { createCard, updateCard, archiveCard, createCardValidation } = require("../controllers/cardController");
const { protect, requireCardAccess } = require("../middleware/auth");
const { handleValidationErrors } = require("../middleware/validate");

router.use(protect);

router.post("/", createCardValidation, handleValidationErrors, createCard);
router.patch("/:cardId", requireCardAccess, updateCard);
router.delete("/:cardId", requireCardAccess, archiveCard);

module.exports = router;
