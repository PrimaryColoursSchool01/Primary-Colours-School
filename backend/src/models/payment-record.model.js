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
      enum: ["pending", "partially_accepted", "accepted", "rejected"],
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

// ── AUTO-CALCULATE PARENT STATUS ───────────────────────────────
// Using async function — Mongoose 7+ awaits the returned promise automatically,
// so no next() callback is needed. The callback style breaks with Model.create()
// in Mongoose 9.x, causing "next is not a function".
paymentRecordSchema.pre("save", async function () {
  if (!this.isModified("items")) return;

  const statuses = this.items.map((i) => i.status || "pending");
  const allAccepted = statuses.every((s) => s === "accepted");
  const allRejected = statuses.every((s) => s === "rejected");
  const anyAccepted = statuses.some((s) => s === "accepted");

  if (allAccepted) {
    this.status = "accepted";
    this.acceptedAt ||= new Date();
  } else if (allRejected) {
    this.status = "rejected";
    this.rejectedAt ||= new Date();
  } else if (anyAccepted) {
    this.status = "partially_accepted";
    this.acceptedAt ||= new Date();
  } else {
    this.status = "pending";
  }
});

// Indexes
paymentRecordSchema.index({ dateOfPayment: 1, status: 1, classId: 1 });
paymentRecordSchema.index({ "items.status": 1, "items.itemId": 1 });
paymentRecordSchema.index({ modeOfPayment: 1, dateOfPayment: 1 });
paymentRecordSchema.index({ nameOfChild: "text", nameOfPayerOrCompany: "text" });

const PaymentRecord = mongoose.model("PaymentRecord", paymentRecordSchema);
export default PaymentRecord;
