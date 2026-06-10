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
  removeMember,
  getWorkspaceBoards,
  createWorkspaceValidation,
  inviteMemberValidation,
} = require("../controllers/workspaceController");
const {
  protect,
  requireWorkspaceMember,
  requireWorkspaceAdmin,
} = require("../middleware/auth");
const { handleValidationErrors } = require("../middleware/validate");

// All routes require authentication
router.use(protect);

router.post(
  "/",
  createWorkspaceValidation,
  handleValidationErrors,
  createWorkspace
);
router.get("/", getMyWorkspaces);

// Accept invite (needs auth but not workspace membership yet)
router.post("/accept-invite/:token", acceptInvite);

router.get("/:workspaceId", getWorkspace);
router.get("/:workspaceId/boards", requireWorkspaceMember, getWorkspaceBoards);

router.patch(
  "/:workspaceId",
  requireWorkspaceAdmin,
  handleValidationErrors,
  updateWorkspace
);
router.delete("/:workspaceId", archiveWorkspace);

router.post(
  "/:workspaceId/invite",
  requireWorkspaceAdmin,
  inviteMemberValidation,
  handleValidationErrors,
  inviteMember
);

router.delete("/:workspaceId/members/:userId", requireWorkspaceMember, removeMember);

module.exports = router;
