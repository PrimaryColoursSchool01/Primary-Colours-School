// controllers/staff.controller.js
import mongoose from "mongoose";
import ItemTransaction from "../models/item-transaction.model.js";
import PaymentRecord from "../models/payment-record.model.js";
import Item from "../models/items-fess.model.js";
import Class from "../models/class.model.js";
import User from "../models/user.model.js";

// ─── Helpers: Permission resolution ───────────────────────────────────────────

const resolveStaffPermissions = (user) => {
  const authorizedItemIds = new Set();
  user.roles?.forEach((role) => {
    role.itemIds?.forEach((id) => authorizedItemIds.add(id.toString()));
  });
  return { authorizedItemIds: Array.from(authorizedItemIds) };
};

// ─── Helper: Group flat transactions by paymentRecordId ───────────────────────

function groupTransactions(transactions) {
  const groupMap = new Map();

  for (const tx of transactions) {
    const prId = tx.paymentRecordId?._id?.toString() || tx.paymentRecordId?.toString();
    if (!prId) continue;

    if (!groupMap.has(prId)) {
      groupMap.set(prId, {
        paymentRecordId: prId,
        studentName: tx.paymentRecordId?.nameOfChild || "Unknown",
        className: tx.paymentRecordId?.classId?.name || "N/A",
        dateOfPayment: tx.paymentRecordId?.dateOfPayment || null,
        items: [],
      });
    }

    groupMap.get(prId).items.push({
      transactionId: tx._id,
      itemName: tx.itemId?.name || "Unknown Item",
      quantity: tx.quantity,
      status: tx.status,
      createdAt: tx.createdAt,
      handedOverBy: tx.handedOverBy?.fullName || "System",
      handedOverAt: tx.handedOverAt || null,
      note: tx.statusHistory?.slice(-1)[0]?.reason || null,
    });
  }

  return Array.from(groupMap.values());
}

// ─── Controllers ──────────────────────────────────────────────────────────────

export const getStaffDashboard = async (req, res, next) => {
  try {
    const { authorizedItemIds } = resolveStaffPermissions(req.user);
    const staffId = req.user.id;

    const pendingFilter = {
      status: "pending",
      $or: [
        { itemId: { $in: authorizedItemIds.map((id) => new mongoose.Types.ObjectId(id)) } },
        { staffIds: { $in: [new mongoose.Types.ObjectId(staffId)] } },
      ],
    };

    if (authorizedItemIds.length === 0) {
      pendingFilter.$or = [{ staffIds: { $in: [new mongoose.Types.ObjectId(staffId)] } }];
    }

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const [pendingCount, collectedTodayCount] = await Promise.all([
      ItemTransaction.countDocuments(pendingFilter),
      ItemTransaction.countDocuments({
        status: "collected",
        handedOverAt: { $gte: startOfDay, $lt: endOfDay },
        $or: [
          { itemId: { $in: authorizedItemIds.map((id) => new mongoose.Types.ObjectId(id)) } },
          { staffIds: { $in: [new mongoose.Types.ObjectId(staffId)] } },
        ],
      }),
    ]);

    const priorityTxs = await ItemTransaction.find(pendingFilter)
      .populate({
        path: "paymentRecordId",
        select: "nameOfChild classId dateOfPayment",
        populate: { path: "classId", select: "name" },
      })
      .populate("itemId", "name")
      .sort({ createdAt: 1 })
      .limit(25)
      .lean();

    const grouped = groupTransactions(priorityTxs).slice(0, 5);

    return res.status(200).json({
      success: true,
      message: "Dashboard loaded successfully",
      data: {
        welcome: { name: req.user.fullName?.split(" ")[0] || "Staff", date: new Date().toISOString().split("T")[0] },
        stats: { pending: pendingCount, collectedToday: collectedTodayCount },
        priorityActions: grouped,
      },
    });
  } catch (error) {
    console.error("Error loading staff dashboard:", error);
    next(error);
  }
};

export const getStaffAssignments = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, classId, search } = req.query;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = parseInt(limit);

    const { authorizedItemIds } = resolveStaffPermissions(req.user);
    const staffId = req.user.id;

    let baseFilter = {
      status: "pending",
      $or: [
        { itemId: { $in: authorizedItemIds.map((id) => new mongoose.Types.ObjectId(id)) } },
        { staffIds: { $in: [new mongoose.Types.ObjectId(staffId)] } },
      ],
    };

    if (authorizedItemIds.length === 0) {
      baseFilter.$or = [{ staffIds: { $in: [new mongoose.Types.ObjectId(staffId)] } }];
    }

    if (classId) {
      const classPRs = await PaymentRecord.find({ classId: new mongoose.Types.ObjectId(classId) }).select("_id");
      const classPRIds = classPRs.map((r) => r._id);
      baseFilter.paymentRecordId = { $in: classPRIds };
    }

    // ── Search by student name only — preserves group integrity ──────────
    if (search && search.trim()) {
      const matchingPRs = await PaymentRecord.find({
        nameOfChild: { $regex: search.trim(), $options: "i" },
      }).select("_id");

      if (matchingPRs.length === 0) {
        return res.status(200).json({
          success: true,
          message: "Assignments fetched successfully",
          data: { groups: [], total: 0, page: pageNum, pages: 0 },
        });
      }

      // Intersect with any existing paymentRecordId filter
      const searchIds = matchingPRs.map((r) => r._id);
      if (baseFilter.paymentRecordId) {
        const existing = baseFilter.paymentRecordId.$in.map((id) => id.toString());
        const filtered = searchIds.filter((id) => existing.includes(id.toString()));
        baseFilter.paymentRecordId = { $in: filtered };
      } else {
        baseFilter.paymentRecordId = { $in: searchIds };
      }
    }

    const allTransactions = await ItemTransaction.find(baseFilter)
      .populate({
        path: "paymentRecordId",
        select: "nameOfChild classId dateOfPayment",
        populate: { path: "classId", select: "name" },
      })
      .populate("itemId", "name")
      .sort({ createdAt: 1 })
      .lean();

    const allGroups = groupTransactions(allTransactions);
    const total = allGroups.length;
    const pages = Math.ceil(total / limitNum);
    const skip = (pageNum - 1) * limitNum;
    const paginatedGroups = allGroups.slice(skip, skip + limitNum);

    return res.status(200).json({
      success: true,
      message: "Assignments fetched successfully",
      data: {
        groups: paginatedGroups,
        total,
        page: pageNum,
        pages,
      },
    });
  } catch (error) {
    console.error("Error fetching staff assignments:", error);
    next(error);
  }
};

export const markCollected = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { note } = req.body;
    const staffId = req.user.id;

    if (!id) {
      const err = new Error("Transaction ID is required");
      err.statusCode = 400;
      return next(err);
    }

    const { authorizedItemIds } = resolveStaffPermissions(req.user);

    const transaction = await ItemTransaction.findById(id).populate("itemId").populate("paymentRecordId", "classId");

    if (!transaction) {
      const err = new Error("Transaction not found");
      err.statusCode = 404;
      return next(err);
    }

    if (transaction.status !== "pending") {
      const err = new Error("Item is not in pending status");
      err.statusCode = 400;
      return next(err);
    }

    const isAuthorized =
      authorizedItemIds.includes(transaction.itemId._id.toString()) || transaction.staffIds?.some((sid) => sid.toString() === staffId);

    if (!isAuthorized) {
      const err = new Error("Not authorized to collect this item");
      err.statusCode = 403;
      return next(err);
    }

    transaction.status = "collected";
    transaction.handedOverBy = new mongoose.Types.ObjectId(staffId);
    transaction.handedOverAt = new Date();
    transaction.statusHistory.push({
      status: "collected",
      changedBy: new mongoose.Types.ObjectId(staffId),
      changedAt: new Date(),
      reason: note?.trim() || "Marked as collected",
    });

    await transaction.save();

    // ── Decrement stock if item has inventory tracking enabled ────────────
    if (transaction.itemId.stockQuantity !== null && transaction.itemId.stockQuantity !== undefined) {
      await Item.findByIdAndUpdate(transaction.itemId._id, {
        $inc: { stockQuantity: -transaction.quantity },
      });
    }

    return res.status(200).json({
      success: true,
      message: "Item marked as collected successfully",
      data: {
        transactionId: transaction._id,
        status: transaction.status,
        handedOverAt: transaction.handedOverAt,
      },
    });
  } catch (error) {
    console.error("Error marking item as collected:", error);
    next(error);
  }
};

export const getStaffHistory = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, startDate, endDate, classId, search } = req.query;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = parseInt(limit);

    const { authorizedItemIds } = resolveStaffPermissions(req.user);
    const staffId = req.user.id;

    let baseFilter = {
      status: "collected",
      $or: [
        { itemId: { $in: authorizedItemIds.map((id) => new mongoose.Types.ObjectId(id)) } },
        { staffIds: { $in: [new mongoose.Types.ObjectId(staffId)] } },
      ],
    };

    if (authorizedItemIds.length === 0) {
      baseFilter.$or = [{ staffIds: { $in: [new mongoose.Types.ObjectId(staffId)] } }];
    }

    if (startDate || endDate) {
      const dateFilter = {};
      if (startDate) dateFilter.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        dateFilter.$lte = end;
      }
      baseFilter.handedOverAt = dateFilter;
    }

    if (classId) {
      const classPRs = await PaymentRecord.find({ classId: new mongoose.Types.ObjectId(classId) }).select("_id");
      const classPRIds = classPRs.map((r) => r._id);
      baseFilter.paymentRecordId = { $in: classPRIds };
    }

    // ── Search by student name only — preserves group integrity ──────────
    if (search && search.trim()) {
      const matchingPRs = await PaymentRecord.find({
        nameOfChild: { $regex: search.trim(), $options: "i" },
      }).select("_id");

      if (matchingPRs.length === 0) {
        return res.status(200).json({
          success: true,
          message: "History fetched successfully",
          data: { groups: [], total: 0, page: pageNum, pages: 0 },
        });
      }

      const searchIds = matchingPRs.map((r) => r._id);
      if (baseFilter.paymentRecordId) {
        const existing = baseFilter.paymentRecordId.$in.map((id) => id.toString());
        const filtered = searchIds.filter((id) => existing.includes(id.toString()));
        baseFilter.paymentRecordId = { $in: filtered };
      } else {
        baseFilter.paymentRecordId = { $in: searchIds };
      }
    }

    const allTransactions = await ItemTransaction.find(baseFilter)
      .populate({
        path: "paymentRecordId",
        select: "nameOfChild classId dateOfPayment",
        populate: { path: "classId", select: "name" },
      })
      .populate("itemId", "name")
      .populate("handedOverBy", "fullName")
      .sort({ handedOverAt: -1 })
      .lean();

    const allGroups = groupTransactions(allTransactions);
    const total = allGroups.length;
    const pages = Math.ceil(total / limitNum);
    const skip = (pageNum - 1) * limitNum;
    const paginatedGroups = allGroups.slice(skip, skip + limitNum);

    return res.status(200).json({
      success: true,
      message: "History fetched successfully",
      data: {
        groups: paginatedGroups,
        total,
        page: pageNum,
        pages,
      },
    });
  } catch (error) {
    console.error("Error fetching staff history:", error);
    next(error);
  }
};

export const getStaffClasses = async (req, res, next) => {
  try {
    const { authorizedItemIds } = resolveStaffPermissions(req.user);

    if (authorizedItemIds.length === 0) {
      return res.status(200).json({
        success: true,
        message: "Classes fetched successfully",
        data: { classes: [] },
      });
    }

    const items = await Item.find({ _id: { $in: authorizedItemIds } })
      .select("classIds")
      .lean();
    const classIds = new Set();
    items.forEach((item) => {
      item.classIds?.forEach((cid) => classIds.add(cid.toString()));
    });

    const classes = await Class.find({ _id: { $in: Array.from(classIds) } })
      .select("_id name")
      .sort({ name: 1 });

    return res.status(200).json({
      success: true,
      message: "Classes fetched successfully",
      data: { classes },
    });
  } catch (error) {
    console.error("Error fetching staff classes:", error);
    next(error);
  }
};
