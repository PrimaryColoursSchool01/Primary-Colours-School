import mongoose from "mongoose";

const itemTransactionSchema = new mongoose.Schema(
  {
    paymentRecordId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PaymentRecord",
      required: true,
    },
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Item",
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    amountAtPayment: {
      type: Number,
      required: true,
      min: 0,
    },
    staffIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    handedOverBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    status: {
      type: String,
      required: true,
      enum: ["unassigned", "pending", "collected"],
      default: "pending",
    },
    handedOverAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

const ItemTransaction = mongoose.model("ItemTransaction", itemTransactionSchema);

export default ItemTransaction;
