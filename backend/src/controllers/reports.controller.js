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

    // ── 1. PAYMENT SUMMARY ────────────────────────────────────────────
    const summaryResult = await PaymentRecord.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: "$_id",
          status: { $first: "$status" },
          modeOfPayment: { $first: "$modeOfPayment" },
          totalAmount: { $first: "$totalAmount" },
          items: { $first: "$items" },
        },
      },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$_id",
          status: { $first: "$status" },
          modeOfPayment: { $first: "$modeOfPayment" },
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
          hasAcceptedItem: {
            $max: { $cond: [{ $eq: ["$items.status", "accepted"] }, 1, 0] },
          },
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$totalRevenue" },
          pendingRevenue: { $sum: "$pendingRevenue" },
          acceptedCount: { $sum: { $cond: [{ $eq: ["$status", "accepted"] }, 1, 0] } },
          partiallyAcceptedCount: { $sum: { $cond: [{ $eq: ["$status", "partially_accepted"] }, 1, 0] } },
          pendingCount: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] } },
          rejectedCount: { $sum: { $cond: [{ $eq: ["$status", "rejected"] }, 1, 0] } },
          totalCount: { $sum: 1 },
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

    // ── 2. ITEM FULFILLMENT (via ItemTransaction) ─────────────────────
    const acceptedPaymentIds = await PaymentRecord.find({
      ...matchStage,
      "items.status": "accepted",
    }).distinct("_id");

    //  FIX: Only count routable items (pending + collected) for rate
    const [pendingItems, collectedItems, noRoleItems, noStaffItems] = await Promise.all([
      ItemTransaction.countDocuments({
        paymentRecordId: { $in: acceptedPaymentIds },
        status: "pending",
      }),
      ItemTransaction.countDocuments({
        paymentRecordId: { $in: acceptedPaymentIds },
        status: "collected",
      }),
      ItemTransaction.countDocuments({
        paymentRecordId: { $in: acceptedPaymentIds },
        status: "no_role",
      }),
      ItemTransaction.countDocuments({
        paymentRecordId: { $in: acceptedPaymentIds },
        status: "no_staff",
      }),
    ]);

    //  FIX: Collection rate only counts routable items
    const routableItems = pendingItems + collectedItems;
    const collectionRate = routableItems > 0 ? Math.round((collectedItems / routableItems) * 100) : 0;

    // ── 3. TOP PENDING ITEMS ─────────────────────────────────────────
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

    // ── 4. CLASS BREAKDOWN ───────────────────────────────────────────
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
      {
        $group: {
          _id: "$_id",
          classId: { $first: "$classId" },
          className: { $first: "$classInfo.name" },
          status: { $first: "$status" },
          totalAmount: { $first: "$totalAmount" },
          items: { $first: "$items" },
        },
      },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$_id",
          classId: { $first: "$classId" },
          className: { $first: "$className" },
          status: { $first: "$status" },
          acceptedRevenue: {
            $sum: {
              $cond: [{ $eq: ["$items.status", "accepted"] }, "$items.amountAtPayment", 0],
            },
          },
        },
      },
      {
        $group: {
          _id: "$classId",
          className: { $first: "$className" },
          paymentsAccepted: { $sum: { $cond: [{ $eq: ["$status", "accepted"] }, 1, 0] } },
          paymentsPartiallyAccepted: { $sum: { $cond: [{ $eq: ["$status", "partially_accepted"] }, 1, 0] } },
          paymentsPending: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] } },
          paymentsRejected: { $sum: { $cond: [{ $eq: ["$status", "rejected"] }, 1, 0] } },
          totalAmount: { $sum: "$acceptedRevenue" },
        },
      },
    ]);

    const classItemStats = await PaymentRecord.aggregate([
      { $match: matchStage },
      { $unwind: "$items" },
      { $match: { "items.status": "accepted" } },
      {
        $group: {
          _id: "$classId",
          acceptedItemCount: { $sum: { $ifNull: ["$items.quantity", 1] } },
        },
      },
    ]);

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

    const paymentMap = new Map(classPaymentStats.map((c) => [c._id?.toString(), c]));
    const itemMap = new Map(classItemStats.map((c) => [c._id?.toString(), c.acceptedItemCount]));
    const fulfillmentMap = new Map(classFulfillmentStats.map((c) => [c._id?.toString(), c.collectedCount]));

    const byClassResult = classPaymentStats.map((cls) => {
      const classId = cls._id?.toString();
      const itemsAccepted = itemMap.get(classId) || 0;
      const itemsCollected = fulfillmentMap.get(classId) || 0;

      return {
        _id: cls._id,
        className: cls.className || "Unknown",
        paymentsAccepted: cls.paymentsAccepted || 0,
        paymentsPartiallyAccepted: cls.paymentsPartiallyAccepted || 0,
        paymentsPending: cls.paymentsPending || 0,
        paymentsRejected: cls.paymentsRejected || 0,
        totalAmount: cls.totalAmount || 0,
        itemsAccepted,
        itemsCollected,
        completionRate: itemsAccepted > 0 ? Math.round((itemsCollected / itemsAccepted) * 100) : 0,
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
          totalItems: pendingItems + collectedItems + noRoleItems + noStaffItems,
          collected: collectedItems,
          pending: pendingItems,
          noRole: noRoleItems, //  NEW: Expose for admin visibility
          noStaff: noStaffItems, //  NEW: Expose for admin visibility
          collectionRate, //  NOW ACCURATE: Only routable items
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
