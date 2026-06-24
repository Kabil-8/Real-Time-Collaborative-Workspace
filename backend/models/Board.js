const mongoose = require("mongoose");

const boardSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Board title is required"],
      trim: true,
      maxlength: [100, "Board title cannot exceed 100 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
      default: "",
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
    background: {
      type: {
        type: String,
        enum: ["color", "gradient"],
        default: "gradient",
      },
      value: {
        type: String,
        default: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      },
    },
    visibility: {
      type: String,
      enum: ["workspace", "private"],
      default: "workspace",
    },
    // Members can be a subset of workspace members
    members: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        role: {
          type: String,
          enum: ["admin", "member", "viewer"],
          default: "member",
        },
        _id: false,
      },
    ],
    // Lists are stored separately but referenced here for ordering
    listOrder: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "List",
      },
    ],
    labels: [
      {
        _id: {
          type: String,
          default: () => Math.random().toString(36).slice(2, 9),
        },
        name: { type: String, trim: true },
        color: { type: String, default: "#6366f1" },
      },
    ],
    isStarred: {
      type: Boolean,
      default: false,
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
    lastActivity: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Pre-seeded label colors for new boards
boardSchema.pre("save", function (next) {
  if (this.isNew && this.labels.length === 0) {
    this.labels = [
      { name: "Bug", color: "#ef4444" },
      { name: "Feature", color: "#8b5cf6" },
      { name: "Improvement", color: "#3b82f6" },
      { name: "Urgent", color: "#f97316" },
      { name: "Design", color: "#ec4899" },
      { name: "Documentation", color: "#14b8a6" },
    ];
  }
  next();
});

module.exports = mongoose.model("Board", boardSchema);
