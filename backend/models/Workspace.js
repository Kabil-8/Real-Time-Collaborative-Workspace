const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const memberSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    role: {
      type: String,
      enum: ["owner", "admin", "member", "viewer"],
      default: "member",
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const inviteSchema = new mongoose.Schema(
  {
    token: {
      type: String,
      default: () => uuidv4(),
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ["admin", "member", "viewer"],
      default: "member",
    },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    expiresAt: {
      type: Date,
      default: () => {
        const hours = parseInt(process.env.INVITE_TOKEN_EXPIRES_HOURS || 48);
        return new Date(Date.now() + hours * 60 * 60 * 1000);
      },
    },
    usedAt: {
      type: Date,
      default: null,
    },
  },
  { _id: false }
);

const workspaceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Workspace name is required"],
      trim: true,
      maxlength: [100, "Workspace name cannot exceed 100 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
      default: "",
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
    },
    icon: {
      type: String,
      default: "🏢", // emoji icon
    },
    color: {
      type: String,
      default: "#6366f1",
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    members: [memberSchema],
    pendingInvites: [inviteSchema],
    settings: {
      visibility: {
        type: String,
        enum: ["private", "public"],
        default: "private",
      },
      allowMemberInvites: {
        type: Boolean,
        default: true,
      },
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Auto-generate slug from name
workspaceSchema.pre("save", async function (next) {
  if (this.isNew || this.isModified("name")) {
    const baseSlug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .slice(0, 40);
    const suffix = Math.random().toString(36).slice(2, 7);
    this.slug = `${baseSlug}-${suffix}`;
  }
  next();
});

// Ensure owner is always in members
workspaceSchema.pre("save", function (next) {
  if (this.isNew) {
    const alreadyMember = this.members.some(
      (m) => m.user.toString() === this.owner.toString()
    );
    if (!alreadyMember) {
      this.members.unshift({ user: this.owner, role: "owner" });
    }
  }
  next();
});

// Helper: check if user is a member
// Works whether m.user is a raw ObjectId OR a populated object
workspaceSchema.methods.isMember = function (userId) {
  return this.members.some(
    (m) => (m.user._id || m.user).toString() === userId.toString()
  );
};

// Helper: get a member's role
// Works whether m.user is a raw ObjectId OR a populated object
workspaceSchema.methods.getMemberRole = function (userId) {
  const member = this.members.find(
    (m) => (m.user._id || m.user).toString() === userId.toString()
  );
  return member ? member.role : null;
};

// Helper: check if invite token is valid
workspaceSchema.methods.getValidInvite = function (token) {
  return this.pendingInvites.find(
    (inv) => inv.token === token && !inv.usedAt && inv.expiresAt > new Date()
  );
};

module.exports = mongoose.model("Workspace", workspaceSchema);
