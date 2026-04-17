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

    // ── 1. PAYMENT SUMMARY (Fixed: Count payments, not items) ─
    // Two-stage aggregation:
    // Stage 1: Group by payment ID to count each payment ONCE
    // Stage 2: Unwind items to calculate item-based revenue
    const summaryResult = await PaymentRecord.aggregate([
      { $match: matchStage },
      // First, group by payment ID to preserve payment-level counts
      {
        $group: {
          _id: "$_id",
          status: { $first: "$status" },
          modeOfPayment: { $first: "$modeOfPayment" },
          totalAmount: { $first: "$totalAmount" },
          items: { $first: "$items" },
        },
      },
      // Now unwind items to calculate revenue from accepted items only
      { $unwind: "$items" },
      {
        $group: {
          _id: "$_id", // Group back by payment ID
          status: { $first: "$status" },
          modeOfPayment: { $first: "$modeOfPayment" },
          // Revenue: sum of accepted item amounts
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
          // Payment mode amounts: only from accepted items
          bankAmount: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ["$modeOfPayment", "bank-transfer"] }, { $eq: ["$items.status", "accepted"] }] },
                "$items.amountAtPayment",
                0,
              ],
            },
          },
          cashAmount: {
            $sum: {
              $cond: [{ $and: [{ $eq: ["$modeOfPayment", "cash"] }, { $eq: ["$items.status", "accepted"] }] }, "$items.amountAtPayment", 0],
            },
          },
          posAmount: {
            $sum: {
              $cond: [{ $and: [{ $eq: ["$modeOfPayment", "pos"] }, { $eq: ["$items.status", "accepted"] }] }, "$items.amountAtPayment", 0],
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
          // Mark if this payment has at least one accepted item (for mode counting)
          hasAcceptedItem: {
            $max: { $cond: [{ $eq: ["$items.status", "accepted"] }, 1, 0] },
          },
        },
      },
      // Final grouping: sum up all payments
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$totalRevenue" },
          pendingRevenue: { $sum: "$pendingRevenue" },
          // Payment counts: each payment counted ONCE
          acceptedCount: { $sum: { $cond: [{ $eq: ["$status", "accepted"] }, 1, 0] } },
          partiallyAcceptedCount: { $sum: { $cond: [{ $eq: ["$status", "partially_accepted"] }, 1, 0] } },
          pendingCount: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] } },
          rejectedCount: { $sum: { $cond: [{ $eq: ["$status", "rejected"] }, 1, 0] } },
          totalCount: { $sum: 1 }, // Now correctly counts payments, not items
          // Payment mode counts: count payment if it has accepted items
          bankCount: {
            $sum: { $cond: [{ $and: [{ $eq: ["$modeOfPayment", "bank-transfer"] }, { $eq: ["$hasAcceptedItem", 1] }] }, 1, 0] },
          },
          bankAmount: { $sum: "$bankAmount" },
          cashCount: { $sum: { $cond: [{ $and: [{ $eq: ["$modeOfPayment", "cash"] }, { $eq: ["$hasAcceptedItem", 1] }] }, 1, 0] } },
          cashAmount: { $sum: "$cashAmount" },
          posCount: { $sum: { $cond: [{ $and: [{ $eq: ["$modeOfPayment", "pos"] }, { $eq: ["$hasAcceptedItem", 1] }] }, 1, 0] } },
          posAmount: { $sum: "$posAmount" },
          otherCount: {
            $sum: {
              $cond: [
                { $and: [{ $not: [{ $in: ["$modeOfPayment", ["bank-transfer", "cash", "pos"]] }] }, { $eq: ["$hasAcceptedItem", 1] }] },
                1,
                0,
              ],
            },
          },
          otherAmount: { $sum: "$otherAmount" },
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

    // ── 4. CLASS BREAKDOWN (Three-stage approach with REVENUE from accepted items) ─────────────────────
    // Stage A: Payment-level stats per class with REVENUE from accepted items only
    const classPaymentStats = await PaymentRecord.aggregate([
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

      // First group by payment to preserve payment-level counts
      {
        $group: {
          _id: "$_id",
          classId: { $first: "$classId" },
          className: { $first: "$classInfo.name" },
          status: { $first: "$status" },
          totalAmount: { $first: "$totalAmount" }, // Keep original for reference
          items: { $first: "$items" },
        },
      },

      // Unwind items to calculate revenue from accepted items only
      { $unwind: "$items" },
      {
        $group: {
          _id: "$_id", // Group back by payment ID
          classId: { $first: "$classId" },
          className: { $first: "$className" },
          status: { $first: "$status" },
          // Revenue: sum of accepted item amounts ONLY
          acceptedRevenue: {
            $sum: {
              $cond: [{ $eq: ["$items.status", "accepted"] }, "$items.amountAtPayment", 0],
            },
          },
        },
      },

      // Final grouping by class
      {
        $group: {
          _id: "$classId",
          className: { $first: "$className" },
          // Payment counts (each payment counted once)
          paymentsAccepted: { $sum: { $cond: [{ $eq: ["$status", "accepted"] }, 1, 0] } },
          paymentsPartiallyAccepted: { $sum: { $cond: [{ $eq: ["$status", "partially_accepted"] }, 1, 0] } },
          paymentsPending: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] } },
          paymentsRejected: { $sum: { $cond: [{ $eq: ["$status", "rejected"] }, 1, 0] } },
          // Revenue: sum of accepted item revenue ONLY (consistent with main summary)
          totalAmount: { $sum: "$acceptedRevenue" }, //  FIXED: Now shows revenue from accepted items
        },
      },
    ]);

    // Stage B: Accepted item counts per class (for completion rate calculation)
    const classItemStats = await PaymentRecord.aggregate([
      { $match: matchStage },
      { $unwind: "$items" },
      { $match: { "items.status": "accepted" } }, // Only count accepted items
      {
        $group: {
          _id: "$classId",
          acceptedItemCount: { $sum: { $ifNull: ["$items.quantity", 1] } },
        },
      },
    ]);

    // Stage C: Collected item counts per class via ItemTransaction
    const classFulfillmentStats = await ItemTransaction.aggregate([
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

    // Merge all three results in JavaScript
    const paymentMap = new Map(classPaymentStats.map((c) => [c._id?.toString(), c]));
    const itemMap = new Map(classItemStats.map((c) => [c._id?.toString(), c.acceptedItemCount]));
    const fulfillmentMap = new Map(classFulfillmentStats.map((c) => [c._id?.toString(), c.collectedCount]));

    const byClassResult = classPaymentStats.map((cls) => {
      const classId = cls._id?.toString();
      const itemsAccepted = itemMap.get(classId) || 0; // Count of accepted ITEMS (not payments)
      const itemsCollected = fulfillmentMap.get(classId) || 0; // Count of collected ITEMS

      return {
        _id: cls._id,
        className: cls.className || "Unknown",
        // Payment counts (admin workflow)
        paymentsAccepted: cls.paymentsAccepted || 0,
        paymentsPartiallyAccepted: cls.paymentsPartiallyAccepted || 0,
        paymentsPending: cls.paymentsPending || 0,
        paymentsRejected: cls.paymentsRejected || 0,
        totalAmount: cls.totalAmount || 0, //  Now shows revenue from accepted items only
        // Item counts (staff workflow)
        itemsAccepted, // How many items were approved for this class?
        itemsCollected, // How many of those approved items have been handed to students?
        // Completion rate: % of approved items that have been collected
        completionRate: itemsAccepted > 0 ? Math.round((itemsCollected / itemsAccepted) * 100) : 0,
        // Status badge based on completion rate
        statusBadge:
          itemsAccepted > 0
            ? itemsCollected / itemsAccepted >= 0.8
              ? "good"
              : itemsCollected / itemsAccepted >= 0.5
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

    return res.status(200).json({
      success: true,
      data: {
        summary: {
          totalAmount: summaryRaw.totalRevenue || 0, // Revenue from accepted items only
          pendingRevenue: summaryRaw.pendingRevenue || 0, // Expected revenue from pending items
          acceptedCount: summaryRaw.acceptedCount || 0, // Count of fully accepted PAYMENTS
          partiallyAcceptedCount: summaryRaw.partiallyAcceptedCount || 0, // Count of partial PAYMENTS
          pendingCount: summaryRaw.pendingCount || 0, // Count of pending PAYMENTS
          rejectedCount: summaryRaw.rejectedCount || 0, // Count of rejected PAYMENTS
          totalCount: summaryRaw.totalCount || 0, // Total PAYMENTS (fixed!)
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
