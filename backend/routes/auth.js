const express = require("express");
const { body } = require("express-validator");
const validate = require("../middleware/validate");
const { protect } = require("../middleware/auth");
const ctrl = require("../controllers/authController");

const router = express.Router();

router.post(
  "/register",
  [
    body("name").isString().trim().isLength({ min: 1, max: 80 }),
    body("email").isEmail().normalizeEmail(),
    body("password").isString().isLength({ min: 8, max: 200 }),
  ],
  validate,
  ctrl.register
);

router.post(
  "/login",
  [
    body("email").isEmail().normalizeEmail(),
    body("password").isString().isLength({ min: 1 }),
  ],
  validate,
  ctrl.login
);

router.get("/me", protect, ctrl.me);

router.patch(
  "/profile",
  protect,
  [
    body("name").optional().isString().trim().isLength({ min: 1, max: 80 }),
    body("avatarUrl").optional().isString(),
  ],
  validate,
  ctrl.updateProfile
);

module.exports = router;