const mongoose = require("mongoose");
const { Schema } = mongoose;

const NotificationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    boardId: { type: Schema.Types.ObjectId, ref: "Board", default: null },
    cardId: { type: Schema.Types.ObjectId, ref: "Card", default: null },
    type: { type: String, enum: ["comment", "assignment"], required: true },
    message: { type: String, required: true, maxlength: 500 },
    readAt: { type: Date, default: null },
  },
  { timestamps: true }
);

NotificationSchema.index({ userId: 1, readAt: 1, createdAt: -1 });
module.exports = mongoose.model("Notification", NotificationSchema);
