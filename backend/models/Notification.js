const mongoose = require("mongoose");

/**
 * Notification Model
 *
 * Persists every in-app notification so users can view them
 * even after reconnecting.  Real-time delivery is handled
 * separately via Socket.io (see utils/notifyUser.js).
 *
 * Types
 * ─────
 *  card_assigned  — someone assigned the user to a card
 *  card_comment   — someone commented on a card the user is on
 *  card_due_soon  — a card assigned to the user is due within 24 h
 *  card_moved     — a card assigned to the user was moved to another list
 *  board_invite   — user was invited to a board/workspace
 *  mention        — user was @-mentioned in a comment
 */

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Who triggered the notification (null for system-generated)
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
        "card_comment",
        "card_due_soon",
        "card_moved",
        "board_invite",
        "mention",
      ],
    },

    // Human-readable notification message
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },

    // Optional references for deep-linking
    board: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Board",
      default: null,
    },
    card: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Card",
      default: null,
    },

    // Client-side route the notification links to
    link: {
      type: String,
      default: null,
    },

    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true }
);

// ── Indexes ──────────────────────────────────────────────────────────────────
// Fast unread count queries + paginated list queries
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);
