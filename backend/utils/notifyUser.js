/**
 * utils/notifyUser.js
 *
 * Central utility to:
 *   1. Persist a Notification document in MongoDB
 *   2. Emit `notification:new` in real-time to the recipient's personal
 *      socket room  `user:<recipientId>`
 *
 * Usage (from any controller):
 *   const notifyUser = require("../utils/notifyUser");
 *
 *   await notifyUser(req.app.get("io"), {
 *     recipient : targetUserId,        // ObjectId or string
 *     actor     : req.user._id,        // who triggered it
 *     type      : "card_assigned",
 *     message   : `${req.user.name} assigned you to "${card.title}"`,
 *     board     : card.board,
 *     card      : card._id,
 *     link      : `/boards/${card.board}`,
 *   });
 */

const Notification = require("../models/Notification");

/**
 * @param {import("socket.io").Server | null} io
 * @param {object} payload
 * @param {string|import("mongoose").Types.ObjectId} payload.recipient
 * @param {string|import("mongoose").Types.ObjectId} [payload.actor]
 * @param {string} payload.type
 * @param {string} payload.message
 * @param {string|import("mongoose").Types.ObjectId} [payload.board]
 * @param {string|import("mongoose").Types.ObjectId} [payload.card]
 * @param {string} [payload.link]
 * @returns {Promise<import("../models/Notification").default>}
 */
const notifyUser = async (io, payload) => {
  const { recipient, actor, type, message, board, card, link } = payload;

  // ── 1. Persist ────────────────────────────────────────────────────────────
  const notification = await Notification.create({
    recipient,
    actor:   actor  || null,
    type,
    message,
    board:   board  || null,
    card:    card   || null,
    link:    link   || null,
    isRead:  false,
  });

  // Populate actor for the socket payload
  await notification.populate("actor", "name avatarColor avatar");

  // ── 2. Real-time emit to recipient's personal room ────────────────────────
  if (io) {
    io.to(`user:${recipient}`).emit("notification:new", {
      _id:       notification._id,
      type:      notification.type,
      message:   notification.message,
      link:      notification.link,
      isRead:    false,
      actor:     notification.actor,
      board:     notification.board,
      card:      notification.card,
      createdAt: notification.createdAt,
    });
  }

  return notification;
};

module.exports = notifyUser;
