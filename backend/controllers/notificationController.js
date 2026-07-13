const Notification = require("../models/Notification");
const { successResponse, errorResponse } = require("../utils/response");

async function listNotifications(req, res, next) {
  try {
    const notifications = await Notification.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    return successResponse(res, { notifications });
  } catch (err) {
    next(err);
  }
}

async function markRead(req, res, next) {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { readAt: new Date() },
      { new: true }
    );
    if (!notification) return errorResponse(res, "Notification not found", 404);
    return successResponse(res, { notification });
  } catch (err) {
    next(err);
  }
}

async function markAllRead(req, res, next) {
  try {
    await Notification.updateMany({ userId: req.userId, readAt: null }, { readAt: new Date() });
    return successResponse(res, { ok: true });
  } catch (err) {
    next(err);
  }
}

module.exports = { listNotifications, markRead, markAllRead };
