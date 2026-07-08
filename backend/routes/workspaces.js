const express = require("express");
const router = express.Router();
const {
  createWorkspace,
  getMyWorkspaces,
  getWorkspace,
  updateWorkspace,
  archiveWorkspace,
  inviteMember,
  acceptInvite,
  rejectInvite,
  getMyInvitations,
  removeMember,
  getWorkspaceBoards,
  getWorkspaceAnalytics,
  createWorkspaceValidation,
  inviteMemberValidation,
} = require("../controllers/workspaceController");
const {
  protect,
  requireWorkspaceMember,
  requireWorkspaceAdmin,
} = require("../middleware/auth");
const { handleValidationErrors } = require("../middleware/validate");

router.use(protect);

router.post(
  "/",
  createWorkspaceValidation,
  handleValidationErrors,
  createWorkspace
);
router.get("/", getMyWorkspaces);

router.get("/invitations", getMyInvitations);

// Accept/reject invite (needs auth but not workspace membership yet)
router.post("/accept-invite/:token", acceptInvite);
router.post("/reject-invite/:token", rejectInvite);

router.get("/:workspaceId", getWorkspace);
router.get("/:workspaceId/boards", requireWorkspaceMember, getWorkspaceBoards);
router.get("/:workspaceId/analytics", requireWorkspaceMember, getWorkspaceAnalytics);

router.patch(
  "/:workspaceId",
  requireWorkspaceAdmin,
  handleValidationErrors,
  updateWorkspace
);
router.delete("/:workspaceId", archiveWorkspace);
router.post(
  "/:workspaceId/invite",
  requireWorkspaceMember,
  inviteMemberValidation,
  handleValidationErrors,
  inviteMember
);

router.delete("/:workspaceId/members/:userId", requireWorkspaceMember, removeMember);

module.exports = router;
