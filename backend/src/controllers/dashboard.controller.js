// src/controllers/admin/dashboard.controller.js
import PaymentRecord from "../models/payment-record.model.js";
import ItemTransaction from "../models/item-transaction.model.js";
import Item from "../models/items-fess.model.js";

// ─── Main Dashboard Data ─────────────────────────────────────────────────────

export const getDashboardData = async (req, res, next) => {
  try {
    const [stats, monthlySubmissions, revenueBreakdown, pipelineStatus] = await Promise.all([
      getStats(),
      getMonthlySubmissions(),
      getRevenueBreakdown(),
      getPipelineStatus(),
    ]);

    res.json({
      success: true,
      data: {
        stats,
        monthlySubmissions,
        revenueBreakdown,
        pipelineStatus,
      },
    });
  } catch (error) {
    console.error("Dashboard data fetch error:", error);
    next(error);
  }
};

// ─── Recent Responses (Paginated) ────────────────────────────────────────────

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
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error("Recent responses fetch error:", error);
    next(error);
  }
};

// ─── Helper Functions ────────────────────────────────────────────────────────

async function getStats() {
  try {
    const [total, pending, accepted, rejected, revenueResult] = await Promise.all([
      PaymentRecord.countDocuments(),
      PaymentRecord.countDocuments({ status: "pending" }),
      PaymentRecord.countDocuments({ status: "accepted" }),
      PaymentRecord.countDocuments({ status: "rejected" }),
      // Calculate total revenue from accepted payments
      PaymentRecord.aggregate([
        { $match: { status: "accepted" } },
        { $unwind: "$items" },
        { $group: { _id: null, totalRevenue: { $sum: "$items.amountAtPayment" } } },
      ]),
    ]);

    const totalRevenue = revenueResult[0]?.totalRevenue || 0;

    return {
      total,
      pending,
      accepted,
      rejected,
      totalRevenue, // Add total revenue for dashboard display
    };
  } catch (error) {
    console.error("Stats fetch error:", error);
    throw error;
  }
}

async function getMonthlySubmissions() {
  try {
    // Get last 12 months from today
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const data = await PaymentRecord.aggregate([
      { $match: { createdAt: { $gte: twelveMonthsAgo } } },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    // Month names for formatting
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    return data.map((item) => ({
      month: `${monthNames[item._id.month - 1]} ${String(item._id.year).slice(-2)}`,
      count: item.count,
    }));
  } catch (error) {
    console.error("Monthly submissions fetch error:", error);
    throw error;
  }
}

async function getRevenueBreakdown() {
  try {
    const data = await PaymentRecord.aggregate([
      { $match: { status: "accepted" } },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.itemId",
          totalAmount: { $sum: "$items.amountAtPayment" },
          count: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: "items", // Make sure this matches your Item collection name
          localField: "_id",
          foreignField: "_id",
          as: "item",
        },
      },
      { $unwind: "$item" },
      {
        $group: {
          _id: "$item.name",
          totalAmount: { $sum: "$totalAmount" },
          count: { $sum: "$count" },
        },
      },
      { $sort: { totalAmount: -1 } }, // Sort by highest revenue first
      { $limit: 5 }, // Top 5 items for clean chart display
    ]);

    const grandTotal = data.reduce((sum, item) => sum + item.totalAmount, 0);
    const colors = ["#136dec", "#fbbf24", "#10b981", "#6366f1", "#f43f5e"];

    return data.map((item, index) => ({
      name: item._id,
      value: Math.round((item.totalAmount / grandTotal) * 100) || 0, // Percentage for pie chart
      totalAmount: item.totalAmount, // Actual amount for display
      count: item.count, // Number of payments for this item
      color: colors[index % colors.length],
    }));
  } catch (error) {
    console.error("Revenue breakdown fetch error:", error);
    throw error;
  }
}

async function getPipelineStatus() {
  try {
    // Count payments awaiting verification
    const pendingPayments = await PaymentRecord.countDocuments({ status: "pending" });

    // Get all accepted payment IDs
    const acceptedPaymentIds = await PaymentRecord.find({ status: "accepted" }).distinct("_id");

    // Count ITEMS (not payments) in each fulfillment stage
    const pendingItems = await ItemTransaction.countDocuments({
      paymentRecordId: { $in: acceptedPaymentIds },
      status: "pending",
    });

    const collectedItems = await ItemTransaction.countDocuments({
      paymentRecordId: { $in: acceptedPaymentIds },
      status: "collected",
    });

    // Total items across all stages for percentage calculation
    const totalItems = pendingPayments + pendingItems + collectedItems;

    return [
      {
        stage: "Pending Verification",
        count: pendingPayments,
        description: "Awaiting admin review",
        percentage: Math.round((pendingPayments / totalItems) * 100) || 0,
        color: "#f59e0b",
      },
      {
        stage: "Items Assigned",
        count: pendingItems,
        description: "Staff yet to hand over",
        percentage: Math.round((pendingItems / totalItems) * 100) || 0,
        color: "#136dec",
      },
      {
        stage: "Fully Completed",
        count: collectedItems,
        description: "All items handed over",
        percentage: Math.round((collectedItems / totalItems) * 100) || 0,
        color: "#10b981",
      },
    ];
  } catch (error) {
    console.error("Pipeline status fetch error:", error);
    throw error;
  }
}
