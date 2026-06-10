const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      maxlength: [80, "Name cannot exceed 80 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false, // never returned in queries by default
    },
    avatar: {
      type: String,
      default: null, // URL to avatar image
    },
    avatarColor: {
      // Fallback color for initials avatar
      type: String,
      default: function () {
        const colors = [
          "#6366f1", "#8b5cf6", "#ec4899", "#14b8a6",
          "#f97316", "#eab308", "#22c55e", "#3b82f6",
        ];
        return colors[Math.floor(Math.random() * colors.length)];
      },
    },
    isVerified: {
      type: Boolean,
      default: true, // simplified — no email verification flow for Week 1
    },
    lastActive: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare entered password with hashed password
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Return safe public profile (no password)
userSchema.methods.toPublicJSON = function () {
  return {
    _id: this._id,
    name: this.name,
    email: this.email,
    avatar: this.avatar,
    avatarColor: this.avatarColor,
    lastActive: this.lastActive,
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.model("User", userSchema);
