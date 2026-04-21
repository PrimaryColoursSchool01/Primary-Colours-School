// controllers/staff.controller.js
import mongoose from "mongoose";
import ItemTransaction from "../models/item-transaction.model.js";
import PaymentRecord from "../models/payment-record.model.js";
import Item from "../models/items-fess.model.js";
import Class from "../models/class.model.js";
import User from "../models/user.model.js";

// ─── Helpers: Transform data for frontend ─────────────────────────────────────

function transformPriorityAction(tx) {
  return {
    transactionId: tx._id,
    studentName: tx.paymentRecordId?.nameOfChild || "Unknown",
    className: tx.paymentRecordId?.classId?.name || "N/A",
    itemName: tx.itemId?.name || "Unknown Item",
    quantity: tx.quantity,
    status: tx.status,
  };
}

function transformAssignment(tx) {
  return {
    id: tx._id,
    studentName: tx.paymentRecordId?.nameOfChild || "Unknown",
    className: tx.paymentRecordId?.classId?.name || "N/A",
    dateOfPayment: tx.paymentRecordId?.dateOfPayment,
    itemName: tx.itemId?.name || "Unknown Item",
    quantity: tx.quantity,
    status: tx.status,
    createdAt: tx.createdAt,
  };
}

function transformHistoryItem(tx) {
  return {
    id: tx._id,
    studentName: tx.paymentRecordId?.nameOfChild || "Unknown",
    className: tx.paymentRecordId?.classId?.name || "N/A",
    itemName: tx.itemId?.name || "Unknown Item",
    quantity: tx.quantity,
    handedOverBy: tx.handedOverBy?.fullName || "System",
    handedOverAt: tx.handedOverAt,
    note: tx.statusHistory?.slice(-1)[0]?.reason || null,
  };
}

// ─── Helpers: Permission resolution (SIMPLIFIED) ──────────────────────────────

const resolveStaffPermissions = (user) => {
  const authorizedItemIds = new Set();

  // Just collect all item IDs from the user's roles — no scope filtering
  user.roles?.forEach((role) => {
    role.itemIds?.forEach((id) => authorizedItemIds.add(id.toString()));
  });

  return {
    authorizedItemIds: Array.from(authorizedItemIds),
  };
};

// ─── Controllers ──────────────────────────────────────────────────────────────

export const getStaffDashboard = async (req, res, next) => {
  try {
    const { authorizedItemIds } = resolveStaffPermissions(req.user);
    const staffId = req.user.id;

    // Build simple filter: items the user is authorized for OR explicitly assigned to them
    const pendingFilter = {
      status: "pending",
      $or: [
        { itemId: { $in: authorizedItemIds.map((id) => new mongoose.Types.ObjectId(id)) } },
        { staffIds: { $in: [new mongoose.Types.ObjectId(staffId)] } },
      ],
    };

    // If no authorized items and no explicit assignments, return empty
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

    const priorityActions = await ItemTransaction.find(pendingFilter)
      .populate({
        path: "paymentRecordId",
        select: "nameOfChild classId",
        populate: { path: "classId", select: "name" },
      })
      .populate("itemId", "name")
      .sort({ createdAt: 1 })
      .limit(5)
      .lean();

    return res.status(200).json({
      success: true,
      message: "Dashboard loaded successfully",
      data: {
        welcome: { name: req.user.fullName?.split(" ")[0] || "Staff", date: new Date().toISOString().split("T")[0] },
        stats: { pending: pendingCount, collectedToday: collectedTodayCount },
        priorityActions: priorityActions.map(transformPriorityAction),
      },
    });
  } catch (error) {
    console.error("Error loading staff dashboard:", error);
    next(error);
  }
};

export const getStaffAssignments = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, classId } = req.query;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const { authorizedItemIds } = resolveStaffPermissions(req.user);
    const staffId = req.user.id;

    // Build simple filter: items the user is authorized for OR explicitly assigned to them
    let baseFilter = {
      status: "pending",
      $or: [
        { itemId: { $in: authorizedItemIds.map((id) => new mongoose.Types.ObjectId(id)) } },
        { staffIds: { $in: [new mongoose.Types.ObjectId(staffId)] } },
      ],
    };

    // If no authorized items, only show explicitly assigned
    if (authorizedItemIds.length === 0) {
      baseFilter.$or = [{ staffIds: { $in: [new mongoose.Types.ObjectId(staffId)] } }];
    }

    // Optional class filter (only if explicitly requested by frontend)
    if (classId) {
      const classPRs = await PaymentRecord.find({ classId: new mongoose.Types.ObjectId(classId) }).select("_id");
      const classPRIds = classPRs.map((r) => r._id);
      baseFilter.paymentRecordId = { $in: classPRIds };
    }

    const [transactions, total] = await Promise.all([
      ItemTransaction.find(baseFilter)
        .populate({
          path: "paymentRecordId",
          select: "nameOfChild classId dateOfPayment",
          populate: { path: "classId", select: "name" },
        })
        .populate("itemId", "name")
        .sort({ createdAt: 1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      ItemTransaction.countDocuments(baseFilter),
    ]);

    const pages = Math.ceil(total / limitNum);

    return res.status(200).json({
      success: true,
      message: "Assignments fetched successfully",
      data: {
        transactions: transactions.map(transformAssignment),
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

    // Authorization check: either item is in user's authorized list OR explicitly assigned to them
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
    const skip = (pageNum - 1) * limitNum;

    const { authorizedItemIds } = resolveStaffPermissions(req.user);
    const staffId = req.user.id;

    // Base filter for collected items
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

    // Apply optional filters
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

    // Search filter
    if (search && search.trim()) {
      const q = search.trim();
      const [matchingPRs, matchingItems, matchingStaff] = await Promise.all([
        PaymentRecord.find({ nameOfChild: { $regex: q, $options: "i" } }).select("_id"),
        Item.find({ name: { $regex: q, $options: "i" } }).select("_id"),
        User.find({ fullName: { $regex: q, $options: "i" } }).select("_id"),
      ]);

      const searchConditions = [];
      if (matchingPRs.length) searchConditions.push({ paymentRecordId: { $in: matchingPRs.map((r) => r._id) } });
      if (matchingItems.length) searchConditions.push({ itemId: { $in: matchingItems.map((i) => i._id) } });
      if (matchingStaff.length) searchConditions.push({ handedOverBy: { $in: matchingStaff.map((u) => u._id) } });

      if (searchConditions.length > 0) {
        baseFilter = { ...baseFilter, $or: [...(baseFilter.$or || []), ...searchConditions] };
      }
    }

    const [transactions, total] = await Promise.all([
      ItemTransaction.find(baseFilter)
        .populate({
          path: "paymentRecordId",
          select: "nameOfChild classId",
          populate: { path: "classId", select: "name" },
        })
        .populate("itemId", "name")
        .populate("handedOverBy", "fullName")
        .sort({ handedOverAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      ItemTransaction.countDocuments(baseFilter),
    ]);

    const pages = Math.ceil(total / limitNum);

    return res.status(200).json({
      success: true,
      message: "History fetched successfully",
      data: {
        transactions: transactions.map(transformHistoryItem),
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
    // Simplified: just return classes from items the user is authorized for
    const { authorizedItemIds } = resolveStaffPermissions(req.user);

    if (authorizedItemIds.length === 0) {
      return res.status(200).json({
        success: true,
        message: "Classes fetched successfully",
        data: { classes: [] },
      });
    }

    // Get classes from items the user is authorized for
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
