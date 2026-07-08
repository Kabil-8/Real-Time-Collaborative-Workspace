const express = require("express");
const router = express.Router();
const { createList, updateList, archiveList, createListValidation } = require("../controllers/listController");
const { protect, requireListAccess } = require("../middleware/auth");
const { handleValidationErrors } = require("../middleware/validate");

router.use(protect);

router.post("/", createListValidation, handleValidationErrors, createList);
router.patch("/:listId", requireListAccess, updateList);
router.delete("/:listId", requireListAccess, archiveList);

module.exports = router;
