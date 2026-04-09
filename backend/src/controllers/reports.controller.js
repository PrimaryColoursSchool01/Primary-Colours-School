// controllers/report.controller.js
import mongoose from "mongoose";
import PaymentRecord from "../models/payment-record.model.js";
import Item from "../models/items-fess.model.js";

export const getPaymentSummary = async (req, res, next) => {
  const { startDate, endDate, classId, status } = req.query;

  try {
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
    if (status && status !== "all") matchStage.status = status;

    // 1. Count PAYMENT RECORDS (No item unwind = accurate counts)
    const summaryResult = await PaymentRecord.aggregate([
      { $match: matchStage },
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
          bankCount: { $sum: { $cond: [{ $eq: ["$modeOfPayment", "bank-transfer"] }, 1, 0] } },
          bankAmount: { $sum: { $cond: [{ $eq: ["$modeOfPayment", "bank-transfer"] }, "$totalAmount", 0] } },
          cashCount: { $sum: { $cond: [{ $eq: ["$modeOfPayment", "cash"] }, 1, 0] } },
          cashAmount: { $sum: { $cond: [{ $eq: ["$modeOfPayment", "cash"] }, "$totalAmount", 0] } },
          posCount: { $sum: { $cond: [{ $eq: ["$modeOfPayment", "pos"] }, 1, 0] } },
          posAmount: { $sum: { $cond: [{ $eq: ["$modeOfPayment", "pos"] }, "$totalAmount", 0] } },
          otherCount: { $sum: { $cond: [{ $not: [{ $in: ["$modeOfPayment", ["bank-transfer", "cash", "pos"]] }] }, 1, 0] } },
          otherAmount: { $sum: { $cond: [{ $not: [{ $in: ["$modeOfPayment", ["bank-transfer", "cash", "pos"]] }] }, "$totalAmount", 0] } },
        },
      },
    ]);

    // 2. Get item/class details (WITH item unwind)
    const detailsResult = await PaymentRecord.aggregate([
      { $match: matchStage },
      { $lookup: { from: "classes", localField: "classId", foreignField: "_id", as: "classInfo" } },
      { $unwind: { path: "$classInfo", preserveNullAndEmptyArrays: true } },
      { $unwind: { path: "$items", preserveNullAndEmptyArrays: true } },
      { $lookup: { from: "items", localField: "items.itemId", foreignField: "_id", as: "itemInfo" } },
      { $unwind: { path: "$itemInfo", preserveNullAndEmptyArrays: true } },
      {
        $facet: {
          itemFulfillment: [
            {
              $group: {
                _id: null,
                totalItems: { $sum: { $ifNull: ["$items.quantity", 1] } },
                collectedItems: { $sum: { $cond: [{ $eq: ["$items.status", "collected"] }, { $ifNull: ["$items.quantity", 1] }, 0] } },
                pendingItems: { $sum: { $cond: [{ $eq: ["$items.status", "pending"] }, { $ifNull: ["$items.quantity", 1] }, 0] } },
                unassignedItems: { $sum: { $cond: [{ $eq: ["$items.status", "unassigned"] }, { $ifNull: ["$items.quantity", 1] }, 0] } },
              },
            },
          ],
          topPendingItems: [
            { $match: { "items.status": "pending" } },
            {
              $group: {
                _id: "$items.itemId",
                itemName: { $first: "$itemInfo.name" },
                pendingCount: { $sum: { $ifNull: ["$items.quantity", 1] } },
              },
            },
            { $sort: { pendingCount: -1 } },
            { $limit: 5 },
            { $project: { _id: 0, name: "$itemName", count: "$pendingCount" } },
          ],
          byClass: [
            {
              $group: {
                _id: "$classId",
                className: { $first: "$classInfo.name" },
                paymentsAccepted: { $sum: { $cond: [{ $eq: ["$status", "accepted"] }, 1, 0] } },
                paymentsPending: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] } },
                paymentsRejected: { $sum: { $cond: [{ $eq: ["$status", "rejected"] }, 1, 0] } },
                totalAmount: { $sum: "$totalAmount" },
                itemsAccepted: { $sum: { $cond: [{ $eq: ["$items.status", "accepted"] }, { $ifNull: ["$items.quantity", 1] }, 0] } },
                itemsCollected: { $sum: { $cond: [{ $eq: ["$items.status", "collected"] }, { $ifNull: ["$items.quantity", 1] }, 0] } },
                itemsPending: { $sum: { $cond: [{ $eq: ["$items.status", "pending"] }, { $ifNull: ["$items.quantity", 1] }, 0] } },
              },
            },
            {
              $addFields: {
                completionRate: {
                  $cond: [
                    { $eq: ["$itemsAccepted", 0] },
                    0,
                    { $round: [{ $multiply: [{ $divide: ["$itemsCollected", "$itemsAccepted"] }, 100] }, 1] },
                  ],
                },
                statusBadge: {
                  $cond: [{ $gte: ["$completionRate", 80] }, "good", { $cond: [{ $gte: ["$completionRate", 50] }, "follow-up", "urgent"] }],
                },
              },
            },
            { $sort: { totalAmount: -1 } },
          ],
        },
      },
    ]);

    const summaryRaw = summaryResult[0] || {};
    const detailsRaw = detailsResult[0] || {};
    const itemFulfillmentRaw = detailsRaw.itemFulfillment?.[0] || {};
    const totalCollected = summaryRaw.totalAmount || 0;

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
      summary: {
        totalAmount: summaryRaw.totalAmount || 0,
        acceptedCount: summaryRaw.acceptedCount || 0,
        pendingCount: summaryRaw.pendingCount || 0,
        rejectedCount: summaryRaw.rejectedCount || 0,
        acceptedAmount: summaryRaw.acceptedAmount || 0,
        pendingAmount: summaryRaw.pendingAmount || 0,
        rejectedAmount: summaryRaw.rejectedAmount || 0,
        totalCount: summaryRaw.totalCount || 0,
        paymentModes,
      },
      itemFulfillment: {
        totalItems: itemFulfillmentRaw.totalItems || 0,
        collected: itemFulfillmentRaw.collectedItems || 0,
        pending: itemFulfillmentRaw.pendingItems || 0,
        unassigned: itemFulfillmentRaw.unassignedItems || 0,
        collectionRate:
          itemFulfillmentRaw.totalItems > 0
            ? Math.round(((itemFulfillmentRaw.collectedItems || 0) / itemFulfillmentRaw.totalItems) * 100)
            : 0,
      },
      topPendingItems: detailsRaw.topPendingItems || [],
      byClass: detailsRaw.byClass || [],
      totalRecords: summaryRaw.totalCount || 0,
    });
  } catch (error) {
    console.error("Report Generation Error:", error);
    if (!error.statusCode) error.statusCode = 500;
    next(error);
  }
};
