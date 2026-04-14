// src/controllers/admin/dashboard.controller.js
import PaymentRecord from "../models/payment-record.model.js";
import ItemTransaction from "../models/item-transaction.model.js";

export const getDashboardData = async (req, res, next) => {
  try {
    const [stats, monthlySubmissions, revenueBreakdown, pipelineStatus] = await Promise.all([
      getStats(),
      getMonthlySubmissions(),
      getRevenueBreakdown(),
      getPipelineStatus(),
    ]);

    res.json({ success: true, data: { stats, monthlySubmissions, revenueBreakdown, pipelineStatus } });
  } catch (error) {
    console.error("Dashboard data fetch error:", error);
    next(error);
  }
};

export const getRecentResponses = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const recentResponses = await PaymentRecord.find()
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .populate("classId", "name")
      .populate("items.itemId", "name");

    const total = await PaymentRecord.countDocuments();
    res.json({
      success: true,
      data: {
        recentResponses,
        pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) },
      },
    });
  } catch (error) {
    console.error("Recent responses fetch error:", error);
    next(error);
  }
};

async function getStats() {
  const [total, pending, partiallyAccepted, accepted, rejected, revenueResult, pendingRevenueResult] = await Promise.all([
    PaymentRecord.countDocuments(),
    PaymentRecord.countDocuments({ status: "pending" }),
    PaymentRecord.countDocuments({ status: "partially_accepted" }),
    PaymentRecord.countDocuments({ status: "accepted" }),
    PaymentRecord.countDocuments({ status: "rejected" }),
    // Revenue: sum of accepted items (regardless of parent status)
    PaymentRecord.aggregate([
      { $unwind: "$items" },
      { $match: { "items.status": "accepted" } },
      { $group: { _id: null, total: { $sum: "$items.amountAtPayment" } } },
    ]),
    // Pending revenue: sum of pending items from non-rejected payments
    PaymentRecord.aggregate([
      { $match: { status: { $ne: "rejected" } } },
      { $unwind: "$items" },
      { $match: { "items.status": "pending" } },
      { $group: { _id: null, total: { $sum: "$items.amountAtPayment" } } },
    ]),
  ]);

  return {
    total,
    pending,
    partially_accepted: partiallyAccepted,
    accepted,
    rejected,
    totalRevenue: revenueResult[0]?.total || 0,
    pendingRevenue: pendingRevenueResult[0]?.total || 0,
  };
}

async function getMonthlySubmissions() {
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

  const data = await PaymentRecord.aggregate([
    { $match: { createdAt: { $gte: twelveMonthsAgo } } },
    {
      $group: {
        _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
        count: { $sum: 1 },
      },
    },
    { $sort: { "_id.year": 1, "_id.month": 1 } },
  ]);

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return data.map((item) => ({
    month: `${monthNames[item._id.month - 1]} ${String(item._id.year).slice(-2)}`,
    count: item.count,
  }));
}

async function getRevenueBreakdown() {
  const data = await PaymentRecord.aggregate([
    { $unwind: "$items" },
    // Revenue is based on item acceptance, not parent status
    { $match: { "items.status": "accepted" } },
    {
      $group: {
        _id: "$items.itemId",
        totalAmount: { $sum: "$items.amountAtPayment" },
        count: { $sum: 1 },
      },
    },
    {
      $lookup: { from: "items", localField: "_id", foreignField: "_id", as: "item" },
    },
    { $unwind: "$item" },
    {
      $group: {
        _id: "$item.name",
        totalAmount: { $sum: "$totalAmount" },
        count: { $sum: "$count" },
      },
    },
    { $sort: { totalAmount: -1 } },
    { $limit: 5 },
  ]);

  const grandTotal = data.reduce((sum, item) => sum + item.totalAmount, 0);
  const colors = ["#136dec", "#fbbf24", "#10b981", "#6366f1", "#f43f5e"];

  return data.map((item, index) => ({
    name: item._id,
    value: Math.round((item.totalAmount / grandTotal) * 100) || 0,
    totalAmount: item.totalAmount,
    count: item.count,
    color: colors[index % colors.length],
  }));
}

async function getPipelineStatus() {
  // Pipeline tracks item fulfillment via ItemTransaction (created only for accepted items)
  const [pendingItems, collectedItems] = await Promise.all([
    ItemTransaction.countDocuments({ status: "pending" }),
    ItemTransaction.countDocuments({ status: "collected" }),
  ]);

  const total = pendingItems + collectedItems;
  if (total === 0) {
    return [
      { stage: "Awaiting Handover", count: 0, description: "No items pending", percentage: 0, color: "#f59e0b" },
      { stage: "Fully Collected", count: 0, description: "No items collected yet", percentage: 0, color: "#10b981" },
    ];
  }

  return [
    {
      stage: "Awaiting Handover",
      count: pendingItems,
      description: "Accepted, staff yet to distribute",
      percentage: Math.round((pendingItems / total) * 100),
      color: "#f59e0b",
    },
    {
      stage: "Fully Collected",
      count: collectedItems,
      description: "Student received item",
      percentage: Math.round((collectedItems / total) * 100),
      color: "#10b981",
    },
  ];
}
