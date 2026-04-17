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
    // Now safely accesses the nested class object
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

// ─── Helpers: Permission resolution ───────────────────────────────────────────

const resolveStaffPermissions = (user) => {
  const authorizedItemIds = new Set();
  const scopeFilters = { global: false, sections: new Set(), classes: new Set() };

  user.roles?.forEach((role) => {
    role.itemIds?.forEach((id) => authorizedItemIds.add(id.toString()));

    if (role.scope === "global") {
      scopeFilters.global = true;
    } else if (role.scope === "section" && role.sectionId) {
      scopeFilters.sections.add(role.sectionId.toString());
    } else if (role.scope === "class" && role.classIds?.length) {
      role.classIds.forEach((id) => scopeFilters.classes.add(id.toString()));
    }
  });

  return {
    authorizedItemIds: Array.from(authorizedItemIds),
    scopeFilters: {
      global: scopeFilters.global,
      sections: Array.from(scopeFilters.sections),
      classes: Array.from(scopeFilters.classes),
    },
  };
};

const getScopedPaymentRecordIds = async (scopeFilters) => {
  if (scopeFilters.global) return null;
  if (!scopeFilters.classes.length && !scopeFilters.sections.length) return null;

  const conditions = [];
  if (scopeFilters.classes.length) {
    conditions.push({ classId: { $in: scopeFilters.classes.map((id) => new mongoose.Types.ObjectId(id)) } });
  }
  if (scopeFilters.sections.length) {
    conditions.push({ sectionId: { $in: scopeFilters.sections.map((id) => new mongoose.Types.ObjectId(id)) } });
  }

  if (conditions.length === 0) return null;

  const records = await PaymentRecord.find({ $or: conditions }).select("_id");
  return records.map((r) => r._id);
};

const buildBaseFilter = (authorizedItemIds, paymentRecordIds, staffId, extra = {}) => {
  const conditions = [];

  if (authorizedItemIds.length > 0) {
    conditions.push({ itemId: { $in: authorizedItemIds.map((id) => new mongoose.Types.ObjectId(id)) } });
  }

  if (staffId) {
    conditions.push({ staffIds: { $in: [new mongoose.Types.ObjectId(staffId)] } });
  }

  if (conditions.length === 0) return null;

  const filter = {
    $or: conditions,
    ...extra,
  };

  if (paymentRecordIds !== null && paymentRecordIds.length > 0) {
    filter.paymentRecordId = { $in: paymentRecordIds };
  }

  return filter;
};

// ─── Controllers ──────────────────────────────────────────────────────────────

export const getStaffDashboard = async (req, res, next) => {
  try {
    const { authorizedItemIds, scopeFilters } = resolveStaffPermissions(req.user);
    const staffId = req.user.id;
    const scopedPRIds = await getScopedPaymentRecordIds(scopeFilters);

    const pendingFilter = buildBaseFilter(authorizedItemIds, scopedPRIds, staffId, { status: "pending" });

    if (!pendingFilter) {
      return res.status(200).json({
        success: true,
        message: "Dashboard loaded successfully",
        data: {
          welcome: { name: req.user.fullName?.split(" ")[0] || "Staff", date: new Date().toISOString().split("T")[0] },
          stats: { pending: 0, collectedToday: 0 },
          priorityActions: [],
        },
      });
    }

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    // Helper for collected filter
    const collectedFilter = buildBaseFilter(authorizedItemIds, scopedPRIds, staffId, { status: "collected" });
    const todayFilter = collectedFilter ? { ...collectedFilter, handedOverAt: { $gte: startOfDay, $lt: endOfDay } } : { _id: null }; // Empty filter if none exists

    const [pendingCount, collectedTodayCount] = await Promise.all([
      ItemTransaction.countDocuments(pendingFilter),
      ItemTransaction.countDocuments(todayFilter),
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

    const { authorizedItemIds, scopeFilters } = resolveStaffPermissions(req.user);
    const staffId = req.user.id;
    const scopedPRIds = await getScopedPaymentRecordIds(scopeFilters);

    let baseFilter = buildBaseFilter(authorizedItemIds, scopedPRIds, staffId, { status: "pending" });

    if (!baseFilter) {
      return res.status(200).json({
        success: true,
        message: "Assignments fetched successfully",
        data: { transactions: [], total: 0, page: pageNum, pages: 0 },
      });
    }

    if (classId) {
      const classPRs = await PaymentRecord.find({ classId: new mongoose.Types.ObjectId(classId) }).select("_id");
      const classPRIds = classPRs.map((r) => r._id.toString());
      if (baseFilter.paymentRecordId?.$in) {
        baseFilter.paymentRecordId.$in = baseFilter.paymentRecordId.$in.filter((id) => classPRIds.includes(id.toString()));
      }
    }

    // NESTED POPULATE FIX
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

    const { authorizedItemIds, scopeFilters } = resolveStaffPermissions(req.user);
    const scopedPRIds = await getScopedPaymentRecordIds(scopeFilters);

    const transaction = await ItemTransaction.findById(id).populate("itemId").populate("paymentRecordId", "classId sectionId");

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

    const isItemAuthorized =
      authorizedItemIds.includes(transaction.itemId._id.toString()) || transaction.staffIds?.some((sid) => sid.toString() === staffId);

    if (!isItemAuthorized) {
      const err = new Error("Not authorized to collect this item");
      err.statusCode = 403;
      return next(err);
    }

    if (scopedPRIds !== null && scopedPRIds.length > 0 && !scopedPRIds.includes(transaction.paymentRecordId._id.toString())) {
      const err = new Error("Not authorized for this class or section");
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

    const { authorizedItemIds, scopeFilters } = resolveStaffPermissions(req.user);
    const staffId = req.user.id;
    const scopedPRIds = await getScopedPaymentRecordIds(scopeFilters);

    // ─── 1. BASE FILTER: Auth + Scope + Status (always applied) ─────────
    let baseFilter = buildBaseFilter(authorizedItemIds, scopedPRIds, staffId, { status: "collected" });

    if (!baseFilter) {
      return res.status(200).json({
        success: true,
        message: "History fetched successfully",
        data: { transactions: [], total: 0, page: pageNum, pages: 0 },
      });
    }

    // ─── 2. INDEPENDENT FILTERS: Only add if explicitly provided ───────
    const activeFilters = [baseFilter];

    if (startDate || endDate) {
      const dateFilter = {};
      if (startDate) dateFilter.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        dateFilter.$lte = end;
      }
      activeFilters.push({ handedOverAt: dateFilter });
    }

    if (classId && baseFilter.paymentRecordId?.$in) {
      const classPRs = await PaymentRecord.find({ classId: new mongoose.Types.ObjectId(classId) }).select("_id");
      const classPRIds = classPRs.map((r) => r._id.toString());
      const filteredPRIds = baseFilter.paymentRecordId.$in.filter((id) => classPRIds.includes(id.toString()));

      if (filteredPRIds.length > 0) {
        activeFilters.push({ paymentRecordId: { $in: filteredPRIds } });
      } else {
        activeFilters.push({ _id: new mongoose.Types.ObjectId("000000000000000000000000") });
      }
    }

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

      if (searchConditions.length === 0) {
        activeFilters.push({ _id: new mongoose.Types.ObjectId("000000000000000000000000") });
      } else {
        activeFilters.push({ $or: searchConditions });
      }
    }

    // ─── 3. COMBINE ALL ACTIVE FILTERS ────────────────────────────────
    const preSearchFilter = activeFilters.length === 1 ? activeFilters[0] : { $and: activeFilters };

    // ─── 4. EXECUTE QUERIES ───────────────────────────────────────────
    let transactions, total;

    if (search && search.trim()) {
      const q = search.trim();

      // Aggregation with relevance scoring so child-name matches rank above item/staff matches
      const pipeline = [
        { $match: preSearchFilter },
        {
          $lookup: {
            from: "paymentrecords",
            localField: "paymentRecordId",
            foreignField: "_id",
            as: "_pr",
          },
        },
        {
          $addFields: {
            _relevanceScore: {
              $cond: [
                {
                  $regexMatch: {
                    input: { $ifNull: [{ $arrayElemAt: ["$_pr.nameOfChild", 0] }, ""] },
                    regex: q,
                    options: "i",
                  },
                },
                2, // child name match → highest priority
                1, // item/staff match → lower priority
              ],
            },
          },
        },
        { $sort: { _relevanceScore: -1, handedOverAt: -1 } },
        {
          $facet: {
            data: [{ $skip: skip }, { $limit: limitNum }],
            count: [{ $count: "total" }],
          },
        },
      ];

      const [result] = await ItemTransaction.aggregate(pipeline);
      total = result.count[0]?.total || 0;

      // Re-fetch with Mongoose populate using the ordered IDs from aggregation
      const ids = result.data.map((t) => t._id);
      const populated = await ItemTransaction.find({ _id: { $in: ids } })
        .populate({
          path: "paymentRecordId",
          select: "nameOfChild classId",
          populate: { path: "classId", select: "name" },
        })
        .populate("itemId", "name")
        .populate("handedOverBy", "fullName")
        .lean();

      // Restore the sort order from aggregation since populate scrambles it
      const orderMap = new Map(ids.map((id, i) => [id.toString(), i]));
      transactions = populated.sort((a, b) => orderMap.get(a._id.toString()) - orderMap.get(b._id.toString()));
    } else {
      // No search — skip scoring, use original path
      [transactions, total] = await Promise.all([
        ItemTransaction.find(preSearchFilter)
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
        ItemTransaction.countDocuments(preSearchFilter),
      ]);
    }

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
    const { scopeFilters } = resolveStaffPermissions(req.user);

    // DEBUG: Log what permissions were resolved
    console.log("DEBUG getStaffClasses:", {
      userId: req.user._id,
      roles: req.user.roles?.map((r) => ({
        name: r.name,
        scope: r.scope,
        sectionId: r.sectionId,
        classIds: r.classIds,
      })),
      scopeFilters,
    });

    // Global scope: return all classes (remove status filter if your Class model doesn't have it)
    if (scopeFilters.global) {
      const classes = await Class.find({}).select("_id name").sort({ name: 1 });

      return res.status(200).json({
        success: true,
        message: "Classes fetched successfully",
        data: { classes },
      });
    }

    // Section or class scope: filter by allowed IDs
    const conditions = [];

    if (scopeFilters.sections.length > 0) {
      conditions.push({ sectionId: { $in: scopeFilters.sections } });
    }
    if (scopeFilters.classes.length > 0) {
      conditions.push({ _id: { $in: scopeFilters.classes } });
    }

    if (conditions.length === 0) {
      return res.status(200).json({
        success: true,
        message: "Classes fetched successfully",
        data: { classes: [] },
      });
    }

    // Remove status filter if your Class model doesn't have it
    const classes = await Class.find({ $or: conditions }).select("_id name").sort({ name: 1 });

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
