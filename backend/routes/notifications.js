const express = require("express");
const router  = express.Router();
const { protect } = require("../middleware/auth");
const {
  getNotifications,
  getUnreadCount,
  markRead,
  markAllRead,
  deleteNotification,
} = require("../controllers/notificationController");

router.use(protect);

router.get("/",             getNotifications);
router.get("/unread-count", getUnreadCount);
router.patch("/read-all",   markAllRead);
router.patch("/:id/read",   markRead);
router.delete("/:id",       deleteNotification);

module.exports = router;
