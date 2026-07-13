const mongoose = require("mongoose");
const { Schema } = mongoose;

const CommentSchema = new Schema(
  {
    boardId: { type: Schema.Types.ObjectId, ref: "Board", required: true, index: true },
    cardId: { type: Schema.Types.ObjectId, ref: "Card", required: true, index: true },
    authorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    body: { type: String, required: true, trim: true, maxlength: 2000 },
  },
  { timestamps: true }
);

CommentSchema.index({ cardId: 1, createdAt: 1 });

module.exports = mongoose.model("Comment", CommentSchema);
