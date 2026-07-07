const express = require("express");
const router = express.Router();
const {
  register,
  login,
  getMe,
  updateMe,
  changePassword,
  forgotPassword,
  resetPassword,
  getAllUsers,
  registerValidation,
  loginValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
} = require("../controllers/authController");
const { protect } = require("../middleware/auth");
const { handleValidationErrors } = require("../middleware/validate");

// Public
router.post("/register", registerValidation, handleValidationErrors, register);
router.post("/login", loginValidation, handleValidationErrors, login);
router.post("/forgot-password", forgotPasswordValidation, handleValidationErrors, forgotPassword);
router.post("/reset-password/:token", resetPasswordValidation, handleValidationErrors, resetPassword);

// Protected
router.get("/me", protect, getMe);
router.patch("/me", protect, updateMe);
router.post("/change-password", protect, changePassword);
router.get("/users", protect, getAllUsers);

module.exports = router;

