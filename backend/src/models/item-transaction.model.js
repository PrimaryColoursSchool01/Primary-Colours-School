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
      default: "unassigned",
      // CHANGE: Was "pending", now "unassigned" because new transactions have no staff assigned yet
    },
    handedOverAt: {
      type: Date,
      default: null,
    },
    // NEW: Track status change history for audit trail
    statusHistory: [
      {
        status: {
          type: String,
          required: true,
        },
        changedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        changedAt: {
          type: Date,
          default: Date.now,
        },
        reason: {
          type: String,
        },
      },
    ],
  },
  { timestamps: true },
);

// NEW: Index for faster queries on status and staff assignment
itemTransactionSchema.index({ status: 1, staffIds: 1 });
itemTransactionSchema.index({ paymentRecordId: 1 });

const ItemTransaction = mongoose.model("ItemTransaction", itemTransactionSchema);

export default ItemTransaction;
