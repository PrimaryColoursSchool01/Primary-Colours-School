import mongoose from "mongoose";

const sectionsSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
  },
  { timestamps: true },
);

const Section = mongoose.model("Section", sectionsSchema);

export default Section;
