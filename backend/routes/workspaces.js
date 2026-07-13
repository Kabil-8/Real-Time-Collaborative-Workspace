const express = require("express");
const { body, query } = require("express-validator");
const validate = require("../middleware/validate");
const {
  protect,
  requireWorkspaceMember,
  requireWorkspaceAdmin,
} = require("../middleware/auth");
const ctrl = require("../controllers/workspaceController");

const router = express.Router();
router.use(protect);

router.post(
  "/",
  [body("name").isString().trim().isLength({ min: 1, max: 80 })],
  validate,
  ctrl.createWorkspace
);

router.get("/", ctrl.listMyWorkspaces);

router.post(
  "/accept-invite",
  [body("token").isString().isLength({ min: 10 })],
  validate,
  ctrl.acceptInvite
);

router.get(
  "/:id/search",
  requireWorkspaceMember,
  [query("q").isString().trim().isLength({ min: 2, max: 100 })],
  validate,
  ctrl.searchWorkspace
);

router.get("/:id", requireWorkspaceMember, ctrl.getWorkspace);

router.patch(
  "/:id",
  requireWorkspaceMember,
  requireWorkspaceAdmin,
  [body("name").optional().isString().trim().isLength({ min: 1, max: 80 })],
  validate,
  ctrl.updateWorkspace
);

router.post(
  "/:id/invite",
  requireWorkspaceMember,
  requireWorkspaceAdmin,
  [
    body("email").isEmail().normalizeEmail(),
    body("role").optional().isIn(["admin", "member"]),
  ],
  validate,
  ctrl.inviteMember
);

router.get(
  "/:id/invites",
  requireWorkspaceMember,
  requireWorkspaceAdmin,
  ctrl.listInvites
);

router.delete(
  "/:id/invites/:token",
  requireWorkspaceMember,
  requireWorkspaceAdmin,
  ctrl.revokeInvite
);

router.patch(
  "/:id/members/:userId",
  requireWorkspaceMember,
  requireWorkspaceAdmin,
  [body("role").isIn(["admin", "member"])],
  validate,
  ctrl.updateMemberRole
);

router.delete(
  "/:id/members/:userId",
  requireWorkspaceMember,
  ctrl.removeMember
);

module.exports = router;
