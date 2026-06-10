const mongoose = require("mongoose");

const checklistItemSchema = new mongoose.Schema(
  {
    text: { type: String, trim: true, required: true },
    completed: { type: Boolean, default: false },
    completedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

const checklistSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true, default: "Checklist" },
    items: [checklistItemSchema],
  },
  { _id: true }
);

const attachmentSchema = new mongoose.Schema(
  {
    filename: { type: String, required: true },
    url: { type: String, required: true },
    mimeType: { type: String },
    size: { type: Number }, // bytes
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

const commentSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: [true, "Comment text is required"],
      trim: true,
      maxlength: [2000, "Comment cannot exceed 2000 characters"],
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    isEdited: { type: Boolean, default: false },
    editedAt: { type: Date },
  },
  { timestamps: true }
);

const cardSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Card title is required"],
      trim: true,
      maxlength: [200, "Card title cannot exceed 200 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [10000, "Description cannot exceed 10000 characters"],
      default: "",
    },
    list: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "List",
      required: true,
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
    // Position within its list
    position: {
      type: Number,
      required: true,
      default: 0,
    },
    assignees: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    labels: [
      {
        type: String, // references label._id from the Board's labels array
      },
    ],
    priority: {
      type: String,
      enum: ["none", "low", "medium", "high", "critical"],
      default: "none",
    },
    dueDate: {
      type: Date,
      default: null,
    },
    coverColor: {
      type: String,
      default: null,
    },
    checklists: [checklistSchema],
    attachments: [attachmentSchema],
    comments: [commentSchema],
    isArchived: {
      type: Boolean,
      default: false,
    },
    // For real-time: track who is currently viewing/editing this card
    activeViewers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    // Activity log for the card (lightweight, for Week 3+)
    activityLog: [
      {
        action: { type: String }, // e.g. "moved", "assigned", "updated"
        by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        detail: { type: String },
        at: { type: Date, default: Date.now },
        _id: false,
      },
    ],
  },
  { timestamps: true }
);

// Indexes for common query patterns
cardSchema.index({ list: 1, position: 1 });
cardSchema.index({ board: 1 });
cardSchema.index({ assignees: 1 });
cardSchema.index({ dueDate: 1 });

// Virtual: completion percentage of all checklists
cardSchema.virtual("checklistProgress").get(function () {
  const allItems = this.checklists.flatMap((cl) => cl.items);
  if (allItems.length === 0) return null;
  const done = allItems.filter((i) => i.completed).length;
  return Math.round((done / allItems.length) * 100);
});

module.exports = mongoose.model("Card", cardSchema);
