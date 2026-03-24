import PaymentRecord from "../models/payment-record.model.js";
import ItemTransaction from "../models/item-transaction.model.js";

// ─── Main Dashboard Data ─────────────────────────────────────────────────────

export const getDashboardData = async (req, res, next) => {
  try {
    const [stats, weeklySubmissions, revenueBreakdown, pipelineStatus] = await Promise.all([
      getStats(),
      getWeeklySubmissions(),
      getRevenueBreakdown(),
      getPipelineStatus(),
    ]);

    res.json({
      success: true,
      data: {
        stats,
        weeklySubmissions,
        revenueBreakdown,
        pipelineStatus,
      },
    });
  } catch (error) {
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
    next(error);
  }
};

// ─── Helper Functions ────────────────────────────────────────────────────────

async function getStats() {
  const [total, pending, accepted, rejected] = await Promise.all([
    PaymentRecord.countDocuments(),
    PaymentRecord.countDocuments({ status: "pending" }),
    PaymentRecord.countDocuments({ status: "accepted" }),
    PaymentRecord.countDocuments({ status: "rejected" }),
  ]);

  return { total, pending, accepted, rejected };
}

async function getWeeklySubmissions() {
  const eightWeeksAgo = new Date();
  eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);

  const data = await PaymentRecord.aggregate([
    { $match: { createdAt: { $gte: eightWeeksAgo } } },
    {
      $group: {
        _id: {
          year: { $year: "$createdAt" },
          week: { $week: "$createdAt" },
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { "_id.year": 1, "_id.week": 1 } },
  ]);

  return data.map((item) => ({
    week: `Wk ${String(item._id.week).padStart(2, "0")}`,
    count: item.count,
  }));
}

async function getRevenueBreakdown() {
  const data = await PaymentRecord.aggregate([
    { $match: { status: "accepted" } },
    { $unwind: "$items" },
    {
      $group: {
        _id: "$items.itemId",
        total: { $sum: "$items.amountAtPayment" },
      },
    },
    {
      $lookup: {
        from: "items",
        localField: "_id",
        foreignField: "_id",
        as: "item",
      },
    },
    { $unwind: "$item" },
    {
      $group: {
        _id: "$item.name",
        value: { $sum: "$total" },
      },
    },
  ]);

  const total = data.reduce((sum, item) => sum + item.value, 0);
  const colors = ["#136dec", "#fbbf24", "#10b981", "#6366f1", "#f43f5e"];

  return data.map((item, index) => ({
    name: item._id,
    value: Math.round((item.value / total) * 100) || 0,
    color: colors[index % colors.length],
  }));
}

async function getPipelineStatus() {
  const pending = await PaymentRecord.countDocuments({ status: "pending" });

  const acceptedPayments = await PaymentRecord.find({ status: "accepted" }).distinct("_id");
  const assigned = await ItemTransaction.countDocuments({
    paymentRecordId: { $in: acceptedPayments },
    status: "pending",
  });

  const completed = await PaymentRecord.aggregate([
    { $match: { status: "accepted" } },
    {
      $lookup: {
        from: "itemtransactions",
        localField: "_id",
        foreignField: "paymentRecordId",
        as: "transactions",
      },
    },
    {
      $addFields: {
        allCollected: {
          $allElementsTrue: {
            $map: {
              input: "$transactions",
              as: "t",
              in: { $eq: ["$$t.status", "collected"] },
            },
          },
        },
      },
    },
    { $match: { allCollected: true } },
    { $count: "total" },
  ]);

  const completedCount = completed[0]?.total || 0;
  const total = pending + assigned + completedCount;

  return [
    {
      stage: "Pending Verification",
      count: pending,
      description: "Awaiting admin review",
      percentage: Math.round((pending / total) * 100) || 0,
      color: "#f59e0b",
    },
    {
      stage: "Items Assigned",
      count: assigned,
      description: "Staff yet to hand over",
      percentage: Math.round((assigned / total) * 100) || 0,
      color: "#136dec",
    },
    {
      stage: "Fully Completed",
      count: completedCount,
      description: "All items handed over",
      percentage: Math.round((completedCount / total) * 100) || 0,
      color: "#10b981",
    },
  ];
}
