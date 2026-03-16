import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    userType: {
      type: String,
      required: true,
      enum: ["admin", "staff"],
      default: "staff",
    },
    role: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Role",
      required: function () {
        return this.userType === "staff";
      },
    },
    refreshToken: {
      type: String,
    },
    tokenVersion: {
      type: Number,
      default: 0,
    },
    resetPasswordToken: {
      type: String,
      default: undefined,
    },
    resetPasswordExpires: {
      type: Date,
      default: undefined,
    },
  },
  {
    timestamps: true,
  },
);

const User = mongoose.model("User", userSchema);

export default User;
