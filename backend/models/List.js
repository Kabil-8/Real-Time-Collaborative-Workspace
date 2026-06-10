const mongoose = require("mongoose");

const listSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "List title is required"],
      trim: true,
      maxlength: [100, "List title cannot exceed 100 characters"],
    },
    board: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Board",
      required: true,
    },
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Explicit position index for ordering within a board
    position: {
      type: Number,
      required: true,
      default: 0,
    },
    // Cards are stored separately but ordered here
    cardOrder: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Card",
      },
    ],
    color: {
      type: String,
      default: null, // optional accent color for the list header
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
    wipLimit: {
      // Work-In-Progress limit for Kanban discipline
      type: Number,
      default: null,
    },
  },
  { timestamps: true }
);

// Index for efficient board-scoped queries
listSchema.index({ board: 1, position: 1 });

module.exports = mongoose.model("List", listSchema);
