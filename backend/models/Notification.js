const mongoose = require("mongoose");

/**
 * Notification Model
 * Stores all in-app notifications for users.
 * Types: card_assigned, comment_added, mention, board_invite, role_change, card_due_soon, general
 */
const notificationSchema = new mongoose.Schema(
  {
    // Who receives this notification
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Who triggered this notification (null for system events)
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    type: {
      type: String,
      required: true,
      enum: [
        "card_assigned",
        "comment_added",
        "mention",
        "board_invite",
        "role_change",
        "card_due_soon",
        "card_moved",
        "general",
      ],
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    // Front-end navigation link
    link: {
      type: String,
      default: null,
    },
    // Contextual references (optional — used for deep-link display)
    meta: {
      workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: "Workspace", default: null },
      boardId:     { type: mongoose.Schema.Types.ObjectId, ref: "Board",     default: null },
      cardId:      { type: mongoose.Schema.Types.ObjectId, ref: "Card",      default: null },
      boardTitle:  { type: String, default: null },
      cardTitle:   { type: String, default: null },
    },
    read: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Efficient per-user queries (inbox view)
notificationSchema.index({ recipient: 1, read: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, createdAt: -1 });

// Auto-delete notifications older than 90 days
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

/**
 * Static helper — create and persist a notification,
 * then push a real-time event to the recipient via Socket.io.
 *
 * @param {object} io       - Socket.io server instance (may be null in tests)
 * @param {object} payload  - { recipient, actor, type, title, message, link, meta }
 */
notificationSchema.statics.createAndEmit = async function (io, payload) {
  const notif = await this.create(payload);

  if (io) {
    const populated = await notif.populate("actor", "name avatar avatarColor");
    // Emit to the recipient's personal room
    io.to(`user:${payload.recipient.toString()}`).emit("notify:new", populated);
  }

  return notif;
};

module.exports = mongoose.model("Notification", notificationSchema);
