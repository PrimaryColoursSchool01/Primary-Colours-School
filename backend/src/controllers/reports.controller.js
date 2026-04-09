// controllers/report.controller.js
import mongoose from "mongoose";
import PaymentRecord from "../models/payment-record.model.js";

export const getPaymentSummary = async (req, res, next) => {
  const { startDate, endDate, classId, status } = req.query;

  try {
    const matchStage = {};

    // ── Date Range Filter ──────────────────────────────────────────
    if (startDate || endDate) {
      matchStage.dateOfPayment = {};
      if (startDate) {
        matchStage.dateOfPayment.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setUTCHours(23, 59, 59, 999);
        matchStage.dateOfPayment.$lte = end;
      }
    }

    // ── Optional Filters ───────────────────────────────────────────
    if (classId) {
      matchStage.classId = new mongoose.Types.ObjectId(classId);
    }
    if (status && status !== "all") {
      matchStage.status = status;
    }

    // ── Aggregation Pipeline ───────────────────────────────────────
    const pipeline = [
      { $match: matchStage },
      {
        $lookup: {
          from: "classes",
          localField: "classId",
          foreignField: "_id",
          as: "classInfo",
        },
      },
      { $unwind: { path: "$classInfo", preserveNullAndEmptyArrays: true } },
      {
        $facet: {
          summary: [
            {
              $group: {
                _id: null,
                totalAmount: { $sum: "$totalAmount" },
                acceptedCount: { $sum: { $cond: [{ $eq: ["$status", "accepted"] }, 1, 0] } },
                pendingCount: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] } },
                rejectedCount: { $sum: { $cond: [{ $eq: ["$status", "rejected"] }, 1, 0] } },
                acceptedAmount: { $sum: { $cond: [{ $eq: ["$status", "accepted"] }, "$totalAmount", 0] } },
                pendingAmount: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, "$totalAmount", 0] } },
                rejectedAmount: { $sum: { $cond: [{ $eq: ["$status", "rejected"] }, "$totalAmount", 0] } },
                totalCount: { $sum: 1 },
              },
            },
          ],

          byClass: [
            {
              $group: {
                _id: "$classId",
                className: { $first: "$classInfo.name" },
                accepted: { $sum: { $cond: [{ $eq: ["$status", "accepted"] }, 1, 0] } },
                pending: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] } },
                rejected: { $sum: { $cond: [{ $eq: ["$status", "rejected"] }, 1, 0] } },
                totalAmount: { $sum: "$totalAmount" },
              },
            },
            { $sort: { totalAmount: -1 } },
          ],
        },
      },
    ];

    const results = await PaymentRecord.aggregate(pipeline);

    // Fallback for empty results
    const summary = results[0]?.summary[0] || {
      totalAmount: 0,
      acceptedCount: 0,
      pendingCount: 0,
      rejectedCount: 0,
      acceptedAmount: 0,
      pendingAmount: 0,
      rejectedAmount: 0,
      totalCount: 0,
    };
    const byClass = results[0]?.byClass || [];

    return res.status(200).json({
      summary,
      byClass,
      totalRecords: summary.totalCount,
    });
  } catch (error) {
    console.error("Report Generation Error:", error);
    if (!error.statusCode) error.statusCode = 500;
    next(error);
  }
};
