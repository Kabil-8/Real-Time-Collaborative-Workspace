const mongoose = require("mongoose");
const { Schema } = mongoose;

const CardSchema = new Schema(
  {
    boardId: { type: Schema.Types.ObjectId, ref: "Board", required: true, index: true },
    listId: { type: Schema.Types.ObjectId, ref: "List", required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    order: { type: Number, required: true },
    assigneeIds: { type: [Schema.Types.ObjectId], ref: "User", default: [] },
    labels: { type: [String], default: [] },
    dueDate: { type: Date, default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Card", CardSchema);