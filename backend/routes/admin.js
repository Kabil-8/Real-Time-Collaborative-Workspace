const express = require("express");
const router = express.Router();

const {
  listUsers,
  listAdmins,
  promoteUser,
  revokeRole,
  getUserRole,
} = require("../controllers/adminController");

const { protect, requireAdmin, requireSuperAdmin } = require("../middleware/auth");

// All admin routes require a valid JWT
router.use(protect);

// ── Admin access (admin + superadmin) ────────────────────────────────────────
router.get("/users",              requireAdmin, listUsers);
router.get("/admins",             requireAdmin, listAdmins);
router.get("/users/:userId/role", requireAdmin, getUserRole);

// ── Superadmin-only: promoting users requires admin at minimum,
//    but granting superadmin is guarded inside the controller.
router.post("/users/:userId/promote",   requireAdmin, promoteUser);
router.delete("/users/:userId/role",    requireAdmin, revokeRole);

module.exports = router;
