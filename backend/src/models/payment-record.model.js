import mongoose from "mongoose";

const paymentRecordSchema = new mongoose.Schema(
  {
    nameOfChild: {
      type: String,
      required: true,
      trim: true,
    },
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      required: true,
    },
    nameOfPayerOrCompany: {
      type: String,
      required: true,
      trim: true,
    },
    dateOfPayment: {
      type: Date,
      required: true,
    },
    modeOfPayment: {
      type: String,
      required: true,
      enum: [
        "cash",
        "bank-transfer",
        "ussd",
        "pos",
        "mobile-wallet",
        "internet-banking",
        "direct-bank-deposit",
        "other",
      ],
      trim: true,
    },
    otherModeOfPayment: {
      type: String,
      trim: true,
      required: function () {
        return this.modeOfPayment === "other";
      },
    },
    bankOrPaymentSourceName: {
      type: String,
      required: true,
      trim: true,
    },
    term: {
      type: String,
      trim: true,
    },
    session: {
      type: String,
      required: true,
      trim: true,
    },
    items: [
      {
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
      },
    ],
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      required: true,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
    },
  },
  { timestamps: true },
);

const PaymentRecord = mongoose.model("PaymentRecord", paymentRecordSchema);

export default PaymentRecord;
