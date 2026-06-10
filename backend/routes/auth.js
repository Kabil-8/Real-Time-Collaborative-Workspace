const express = require("express");
const router = express.Router();
const {
  register,
  login,
  getMe,
  updateMe,
  changePassword,
  registerValidation,
  loginValidation,
} = require("../controllers/authController");
const { protect } = require("../middleware/auth");
const { handleValidationErrors } = require("../middleware/validate");

// Public
router.post("/register", registerValidation, handleValidationErrors, register);
router.post("/login", loginValidation, handleValidationErrors, login);

// Protected
router.get("/me", protect, getMe);
router.patch("/me", protect, updateMe);
router.post("/change-password", protect, changePassword);

module.exports = router;
