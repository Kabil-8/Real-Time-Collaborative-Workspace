const Notification = require("../models/Notification");
const { successResponse, errorResponse } = require("../utils/response");

/**
 * GET /api/notifications
 * Paginated list of the authenticated user's notifications.
 * Query: ?page=1&limit=20&unreadOnly=false
 */
exports.getNotifications = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const unreadOnly = req.query.unreadOnly === "true";
    const skip = (page - 1) * limit;

    const filter = { recipient: userId };
    if (unreadOnly) filter.read = false;

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(filter)
        .populate("actor", "name avatar avatarColor")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Notification.countDocuments(filter),
      Notification.countDocuments({ recipient: userId, read: false }),
    ]);

    return successResponse(res, {
      notifications,
      unreadCount,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasMore: skip + notifications.length < total,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/notifications/unread-count
 * Lightweight endpoint for the sidebar badge.
 */
exports.getUnreadCount = async (req, res, next) => {
  try {
    const count = await Notification.countDocuments({
      recipient: req.user._id,
      read: false,
    });
    return successResponse(res, { count });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/notifications/:id/read
 * Mark a single notification as read.
 */
exports.markAsRead = async (req, res, next) => {
  try {
    const notif = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user._id },
      { read: true, readAt: new Date() },
      { new: true }
    );
    if (!notif) return errorResponse(res, "Notification not found.", 404);
    return successResponse(res, { notification: notif }, "Marked as read.");
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/notifications/read-all
 * Mark ALL notifications for the authenticated user as read.
 */
exports.markAllAsRead = async (req, res, next) => {
  try {
    const result = await Notification.updateMany(
      { recipient: req.user._id, read: false },
      { read: true, readAt: new Date() }
    );
    return successResponse(res, { updated: result.modifiedCount }, "All notifications marked as read.");
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/notifications/:id
 * Delete a single notification (must belong to auth user).
 */
exports.deleteNotification = async (req, res, next) => {
  try {
    const notif = await Notification.findOneAndDelete({
      _id: req.params.id,
      recipient: req.user._id,
    });
    if (!notif) return errorResponse(res, "Notification not found.", 404);
    return successResponse(res, {}, "Notification deleted.");
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/notifications/clear-all
 * Delete all notifications for the authenticated user.
 */
exports.clearAll = async (req, res, next) => {
  try {
    const result = await Notification.deleteMany({ recipient: req.user._id });
    return successResponse(res, { deleted: result.deletedCount }, "All notifications cleared.");
  } catch (err) {
    next(err);
  }
};
