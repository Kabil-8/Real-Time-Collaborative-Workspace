const mongoose = require("mongoose");
const { Schema } = mongoose;

const MemberSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    role: { type: String, enum: ["owner", "admin", "member"], default: "member" },
  },
  { _id: false }
);

const InviteSchema = new Schema(
  {
    token: { type: String, required: true },
    email: { type: String, required: true, lowercase: true },
    role: { type: String, enum: ["admin", "member"], default: "member" },
    createdAt: { type: Date, default: () => new Date() },
  },
  { _id: false }
);

const WorkspaceSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true },
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    members: { type: [MemberSchema], default: [] },
    invites: { type: [InviteSchema], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Workspace", WorkspaceSchema);