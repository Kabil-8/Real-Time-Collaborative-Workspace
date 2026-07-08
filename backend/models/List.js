const mongoose = require("mongoose");
const { Schema } = mongoose;

const ListSchema = new Schema(
  {
    boardId: { type: Schema.Types.ObjectId, ref: "Board", required: true, index: true },
    title: { type: String, required: true, trim: true },
    order: { type: Number, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("List", ListSchema);