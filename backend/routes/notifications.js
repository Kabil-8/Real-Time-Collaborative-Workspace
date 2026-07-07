const express = require("express");
const router = express.Router();

const {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAll,
} = require("../controllers/notificationController");
const { protect } = require("../middleware/auth");

router.use(protect);

// GET  /api/notifications              — paginated inbox
router.get("/", getNotifications);

// GET  /api/notifications/unread-count — lightweight badge count
router.get("/unread-count", getUnreadCount);

// PATCH /api/notifications/read-all    — mark all read
router.patch("/read-all", markAllAsRead);

// DELETE /api/notifications/clear-all  — delete all
router.delete("/clear-all", clearAll);

// PATCH /api/notifications/:id/read    — mark one read
router.patch("/:id/read", markAsRead);

// DELETE /api/notifications/:id        — delete one
router.delete("/:id", deleteNotification);

module.exports = router;
