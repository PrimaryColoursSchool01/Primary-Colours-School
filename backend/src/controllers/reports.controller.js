// controllers/report.controller.js
import mongoose from "mongoose";
import PaymentRecord from "../models/payment-record.model.js";
import ItemTransaction from "../models/item-transaction.model.js";
import Item from "../models/items-fess.model.js";

export const getPaymentSummary = async (req, res, next) => {
  const { startDate, endDate, classId, status } = req.query;

  try {
    // ── BUILD BASE FILTER ─────────────────────────────────────────────
    const matchStage = {};

    if (startDate || endDate) {
      matchStage.dateOfPayment = {};
      if (startDate) matchStage.dateOfPayment.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setUTCHours(23, 59, 59, 999);
        matchStage.dateOfPayment.$lte = end;
      }
    }
    if (classId) matchStage.classId = new mongoose.Types.ObjectId(classId);

    if (status && status !== "all") {
      matchStage.status = status;
    }

    // ── 1. PAYMENT SUMMARY (Parent-level counts + item-based revenue) ─
    const summaryResult = await PaymentRecord.aggregate([
      { $match: matchStage },
      { $unwind: "$items" },
      {
        $group: {
          _id: null,
          totalRevenue: {
            $sum: {
              $cond: [{ $eq: ["$items.status", "accepted"] }, "$items.amountAtPayment", 0],
            },
          },
          pendingRevenue: {
            $sum: {
              $cond: [{ $and: [{ $eq: ["$items.status", "pending"] }, { $ne: ["$status", "rejected"] }] }, "$items.amountAtPayment", 0],
            },
          },
          acceptedCount: { $sum: { $cond: [{ $eq: ["$status", "accepted"] }, 1, 0] } },
          partiallyAcceptedCount: { $sum: { $cond: [{ $eq: ["$status", "partially_accepted"] }, 1, 0] } },
          pendingCount: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] } },
          rejectedCount: { $sum: { $cond: [{ $eq: ["$status", "rejected"] }, 1, 0] } },
          totalCount: { $sum: 1 },
          bankCount: {
            $sum: { $cond: [{ $and: [{ $eq: ["$modeOfPayment", "bank-transfer"] }, { $eq: ["$items.status", "accepted"] }] }, 1, 0] },
          },
          bankAmount: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ["$modeOfPayment", "bank-transfer"] }, { $eq: ["$items.status", "accepted"] }] },
                "$items.amountAtPayment",
                0,
              ],
            },
          },
          cashCount: { $sum: { $cond: [{ $and: [{ $eq: ["$modeOfPayment", "cash"] }, { $eq: ["$items.status", "accepted"] }] }, 1, 0] } },
          cashAmount: {
            $sum: {
              $cond: [{ $and: [{ $eq: ["$modeOfPayment", "cash"] }, { $eq: ["$items.status", "accepted"] }] }, "$items.amountAtPayment", 0],
            },
          },
          posCount: { $sum: { $cond: [{ $and: [{ $eq: ["$modeOfPayment", "pos"] }, { $eq: ["$items.status", "accepted"] }] }, 1, 0] } },
          posAmount: {
            $sum: {
              $cond: [{ $and: [{ $eq: ["$modeOfPayment", "pos"] }, { $eq: ["$items.status", "accepted"] }] }, "$items.amountAtPayment", 0],
            },
          },
          otherCount: {
            $sum: {
              $cond: [
                {
                  $and: [{ $not: [{ $in: ["$modeOfPayment", ["bank-transfer", "cash", "pos"]] }] }, { $eq: ["$items.status", "accepted"] }],
                },
                1,
                0,
              ],
            },
          },
          otherAmount: {
            $sum: {
              $cond: [
                {
                  $and: [{ $not: [{ $in: ["$modeOfPayment", ["bank-transfer", "cash", "pos"]] }] }, { $eq: ["$items.status", "accepted"] }],
                },
                "$items.amountAtPayment",
                0,
              ],
            },
          },
        },
      },
    ]);

    // ── 2. ITEM FULFILLMENT (via ItemTransaction collection) ──────────
    const acceptedPaymentIds = await PaymentRecord.find({
      ...matchStage,
      "items.status": "accepted",
    }).distinct("_id");

    const [pendingItems, collectedItems] = await Promise.all([
      ItemTransaction.countDocuments({
        paymentRecordId: { $in: acceptedPaymentIds },
        status: "pending",
      }),
      ItemTransaction.countDocuments({
        paymentRecordId: { $in: acceptedPaymentIds },
        status: "collected",
      }),
    ]);

    const totalFulfillmentItems = pendingItems + collectedItems;

    // ── 3. TOP PENDING ITEMS (via ItemTransaction) ────────────────────
    const topPendingItems = await ItemTransaction.aggregate([
      {
        $match: {
          paymentRecordId: { $in: acceptedPaymentIds },
          status: "pending",
        },
      },
      {
        $lookup: {
          from: "items",
          localField: "itemId",
          foreignField: "_id",
          as: "itemInfo",
        },
      },
      { $unwind: "$itemInfo" },
      {
        $group: {
          _id: "$itemId",
          itemName: { $first: "$itemInfo.name" },
          pendingCount: { $sum: "$quantity" },
        },
      },
      { $sort: { pendingCount: -1 } },
      { $limit: 5 },
      { $project: { _id: 0, name: "$itemName", count: "$pendingCount" } },
    ]);

    // ── 4. CLASS BREAKDOWN (Simplified two-step approach) ─────────────
    // Step A: Get payment counts per class
    const classPayments = await PaymentRecord.aggregate([
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
        $group: {
          _id: "$classId",
          className: { $first: "$classInfo.name" },
          paymentsAccepted: { $sum: { $cond: [{ $eq: ["$status", "accepted"] }, 1, 0] } },
          paymentsPartiallyAccepted: { $sum: { $cond: [{ $eq: ["$status", "partially_accepted"] }, 1, 0] } },
          paymentsPending: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] } },
          paymentsRejected: { $sum: { $cond: [{ $eq: ["$status", "rejected"] }, 1, 0] } },
          totalAmount: { $sum: "$totalAmount" },
          acceptedItemCount: {
            $sum: {
              $cond: [{ $eq: ["$items.status", "accepted"] }, { $ifNull: ["$items.quantity", 1] }, 0],
            },
          },
        },
      },
      { $sort: { totalAmount: -1 } },
    ]);

    // Step B: Get fulfillment counts per class via ItemTransaction
    const classFulfillment = await ItemTransaction.aggregate([
      {
        $match: {
          paymentRecordId: { $in: acceptedPaymentIds },
          status: "collected",
        },
      },
      {
        $lookup: {
          from: "paymentrecords",
          localField: "paymentRecordId",
          foreignField: "_id",
          as: "payment",
        },
      },
      { $unwind: "$payment" },
      {
        $group: {
          _id: "$payment.classId",
          collectedCount: { $sum: "$quantity" },
        },
      },
    ]);

    // Merge the two results in JavaScript
    const fulfillmentMap = new Map(classFulfillment.map((c) => [c._id.toString(), c.collectedCount]));
    const byClassResult = classPayments.map((cls) => {
      const classId = cls._id?.toString();
      const itemsCollected = fulfillmentMap.get(classId) || 0;
      const acceptedItemCount = cls.acceptedItemCount || 0;

      return {
        _id: cls._id,
        className: cls.className || "Unknown",
        paymentsAccepted: cls.paymentsAccepted || 0,
        paymentsPartiallyAccepted: cls.paymentsPartiallyAccepted || 0,
        paymentsPending: cls.paymentsPending || 0,
        paymentsRejected: cls.paymentsRejected || 0,
        totalAmount: cls.totalAmount || 0,
        itemsAccepted: acceptedItemCount,
        itemsCollected,
        itemsPending: 0, // Could add if needed
        completionRate: acceptedItemCount > 0 ? Math.round((itemsCollected / acceptedItemCount) * 100) : 0,
        statusBadge:
          acceptedItemCount > 0
            ? itemsCollected / acceptedItemCount >= 0.8
              ? "good"
              : itemsCollected / acceptedItemCount >= 0.5
                ? "follow-up"
                : "urgent"
            : "urgent",
      };
    });

    // ── FORMAT RESPONSE ──────────────────────────────────────────────
    const summaryRaw = summaryResult[0] || {};
    const totalCollected = summaryRaw.totalRevenue || 0;

    const paymentModes = {
      bank: {
        count: summaryRaw.bankCount || 0,
        amount: summaryRaw.bankAmount || 0,
        percentage: totalCollected > 0 ? Math.round(((summaryRaw.bankAmount || 0) / totalCollected) * 100) : 0,
      },
      cash: {
        count: summaryRaw.cashCount || 0,
        amount: summaryRaw.cashAmount || 0,
        percentage: totalCollected > 0 ? Math.round(((summaryRaw.cashAmount || 0) / totalCollected) * 100) : 0,
      },
      pos: {
        count: summaryRaw.posCount || 0,
        amount: summaryRaw.posAmount || 0,
        percentage: totalCollected > 0 ? Math.round(((summaryRaw.posAmount || 0) / totalCollected) * 100) : 0,
      },
      other: {
        count: summaryRaw.otherCount || 0,
        amount: summaryRaw.otherAmount || 0,
        percentage: totalCollected > 0 ? Math.round(((summaryRaw.otherAmount || 0) / totalCollected) * 100) : 0,
      },
    };

    // ✅ FIX: Added missing "data:" key
    return res.status(200).json({
      success: true,
      data: {
        summary: {
          totalAmount: summaryRaw.totalRevenue || 0,
          pendingRevenue: summaryRaw.pendingRevenue || 0,
          acceptedCount: summaryRaw.acceptedCount || 0,
          partiallyAcceptedCount: summaryRaw.partiallyAcceptedCount || 0,
          pendingCount: summaryRaw.pendingCount || 0,
          rejectedCount: summaryRaw.rejectedCount || 0,
          totalCount: summaryRaw.totalCount || 0,
          paymentModes,
        },
        itemFulfillment: {
          totalItems: totalFulfillmentItems,
          collected: collectedItems,
          pending: pendingItems,
          collectionRate: totalFulfillmentItems > 0 ? Math.round((collectedItems / totalFulfillmentItems) * 100) : 0,
        },
        topPendingItems: topPendingItems || [],
        byClass: byClassResult || [],
        totalRecords: summaryRaw.totalCount || 0,
      },
    });
  } catch (error) {
    console.error("Report Generation Error:", error);
    if (!error.statusCode) error.statusCode = 500;
    next(error);
  }
};
