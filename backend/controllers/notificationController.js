/**
 * controllers/notificationController.js
 *
 * REST endpoints for the in-app notification system.
 *
 * GET    /api/notifications              — paginated list for current user
 * GET    /api/notifications/unread-count — unread badge count
 * PATCH  /api/notifications/:id/read     — mark single as read
 * PATCH  /api/notifications/read-all     — mark all as read
 * DELETE /api/notifications/:id          — delete one notification
 */

const Notification = require("../models/Notification");
const { successResponse, errorResponse } = require("../utils/response");

// ── GET /api/notifications ─────────────────────────────────────────────────
const getNotifications = async (req, res, next) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page,  10) || 1);
    const limit = Math.min(50, parseInt(req.query.limit, 10) || 30);
    const skip  = (page - 1) * limit;

    const filter = { recipient: req.user._id };
    if (req.query.unread === "true") filter.isRead = false;

    const [notifications, total] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("actor", "name avatarColor avatar")
        .populate("board", "title")
        .populate("card",  "title")
        .lean(),
      Notification.countDocuments(filter),
    ]);

    return successResponse(res, {
      notifications,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/notifications/unread-count ───────────────────────────────────
const getUnreadCount = async (req, res, next) => {
  try {
    const count = await Notification.countDocuments({
      recipient: req.user._id,
      isRead:    false,
    });
    return successResponse(res, { count });
  } catch (err) {
    next(err);
  }
};

// ── PATCH /api/notifications/:id/read ─────────────────────────────────────
const markRead = async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user._id },
      { isRead: true },
      { new: true }
    );
    if (!notification) return errorResponse(res, "Notification not found", 404);
    return successResponse(res, { notification });
  } catch (err) {
    next(err);
  }
};

// ── PATCH /api/notifications/read-all ─────────────────────────────────────
const markAllRead = async (req, res, next) => {
  try {
    const result = await Notification.updateMany(
      { recipient: req.user._id, isRead: false },
      { isRead: true }
    );
    return successResponse(res, { updated: result.modifiedCount });
  } catch (err) {
    next(err);
  }
};

// ── DELETE /api/notifications/:id ─────────────────────────────────────────
const deleteNotification = async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id:       req.params.id,
      recipient: req.user._id,
    });
    if (!notification) return errorResponse(res, "Notification not found", 404);
    return successResponse(res, { message: "Notification deleted" });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getNotifications,
  getUnreadCount,
  markRead,
  markAllRead,
  deleteNotification,
};
