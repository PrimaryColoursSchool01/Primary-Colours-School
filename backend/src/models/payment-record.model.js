import mongoose from "mongoose";

const paymentRecordSchema = new mongoose.Schema(
  {
    nameOfChild: { type: String, required: true, trim: true },
    classId: { type: mongoose.Schema.Types.ObjectId, ref: "Class", required: true },
    nameOfPayerOrCompany: { type: String, required: true, trim: true },
    dateOfPayment: { type: Date, required: true },
    modeOfPayment: {
      type: String,
      required: true,
      enum: ["cash", "bank-transfer", "ussd", "pos", "mobile-wallet", "internet-banking", "direct-bank-deposit", "other"],
      trim: true,
    },
    otherModeOfPayment: {
      type: String,
      trim: true,
      required: function () {
        return this.modeOfPayment === "other";
      },
    },
    bankOrPaymentSourceName: { type: String, required: true, trim: true },
    term: { type: String, trim: true },
    session: { type: String, required: true, trim: true },
    items: [
      {
        itemId: { type: mongoose.Schema.Types.ObjectId, ref: "Item", required: true },
        quantity: { type: Number, required: true, min: 1 },
        amountAtPayment: { type: Number, required: true, min: 0 },
        status: {
          type: String,
          enum: ["pending", "accepted", "rejected"],
          default: "pending",
        },
      },
    ],
    totalAmount: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      required: true,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
    },
    acceptedAt: { type: Date, default: null },
    acceptedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    rejectionReason: { type: String, trim: true, default: null },
    rejectedAt: { type: Date, default: null },
    rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true },
);

// ── PERFORMANCE INDEXES ─────────────────────────────────────────────
//  Primary report filter: date range + status + class
paymentRecordSchema.index({ dateOfPayment: 1, status: 1, classId: 1 });

//  Item-level aggregation: filter by item status + lookup by itemId
paymentRecordSchema.index({ "items.status": 1, "items.itemId": 1 });

//  Mode of payment breakdown (for paymentModes report)
paymentRecordSchema.index({ modeOfPayment: 1, dateOfPayment: 1 });

//  Text search on child/payer names (optional but useful for future)
paymentRecordSchema.index({ nameOfChild: "text", nameOfPayerOrCompany: "text" });

const PaymentRecord = mongoose.model("PaymentRecord", paymentRecordSchema);
export default PaymentRecord;
