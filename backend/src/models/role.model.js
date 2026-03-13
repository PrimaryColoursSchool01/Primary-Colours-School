import mongoose from "mongoose";

const roleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    scope: {
      type: String,
      required: true,
      enum: ["global", "section", "class"],
    },
    sectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Section",
    },
    itemIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Item",
        required: true,
      },
    ],
  },
  { timestamps: true },
);

const Role = mongoose.model("Role", roleSchema);

export default Role;
