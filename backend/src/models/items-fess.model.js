import mongoose from "mongoose";

const itemsSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    scope: {
      type: String,
      required: true,
      enum: ["global", "section", "class"],
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    sectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Section",
      required: function () {
        return this.scope === "section" || this.scope === "class";
      },
    },
    classIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Class",
      },
    ],
    compulsory: {
      type: Boolean,
      default: false,
    },
    stockQuantity: {
      type: Number,
      default: null,
    },
  },
  { timestamps: true },
);

// ── PERFORMANCE INDEXES ─────────────────────────────────────────────
//  Fast lookup by item name (for topPendingItems report)
itemsSchema.index({ name: 1 });

//  Filter items by scope + section/class (for future item reports)
itemsSchema.index({ scope: 1, sectionId: 1, classIds: 1 });

const Item = mongoose.model("Item", itemsSchema);
export default Item;
