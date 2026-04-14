import PaymentRecord from "../models/payment-record.model.js";
import ItemTransaction from "../models/item-transaction.model.js";
import Role from "../models/role.model.js";
import User from "../models/user.model.js";
import Class from "../models/class.model.js";
import Item from "../models/items-fess.model.js";

export const createPaymentRecord = async (req, res, next) => {
  const {
    nameOfChild,
    classId,
    nameOfPayerOrCompany,
    dateOfPayment,
    modeOfPayment,
    otherModeOfPayment,
    bankOrPaymentSourceName,
    term,
    session,
    items,
  } = req.body;

  if (!nameOfChild || !classId || !nameOfPayerOrCompany || !dateOfPayment || !modeOfPayment || !bankOrPaymentSourceName || !session) {
    const err = new Error("Missing required fields");
    err.statusCode = 400;
    return next(err);
  }

  if (modeOfPayment === "other" && !otherModeOfPayment) {
    const err = new Error("Please specify your mode of payment");
    err.statusCode = 400;
    return next(err);
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    const err = new Error("At least one item is required");
    err.statusCode = 400;
    return next(err);
  }

  for (const item of items) {
    if (!item.itemId || !item.quantity || item.quantity < 1) {
      const err = new Error("Each item must have a valid itemId and quantity");
      err.statusCode = 400;
      return next(err);
    }
  }

  try {
    const existingClass = await Class.findById(classId);
    if (!existingClass) {
      const err = new Error("Class not found");
      err.statusCode = 404;
      return next(err);
    }

    const itemIds = items.map((item) => item.itemId);
    const existingItems = await Item.find({ _id: { $in: itemIds } });
    if (existingItems.length !== itemIds.length) {
      const err = new Error("One or more items do not exist");
      err.statusCode = 404;
      return next(err);
    }

    const itemsWithAmount = items.map((item) => {
      const dbItem = existingItems.find((i) => i._id.toString() === item.itemId.toString());
      return {
        itemId: item.itemId,
        quantity: item.quantity,
        amountAtPayment: dbItem.price,
        status: "pending",
      };
    });

    const totalAmount = itemsWithAmount.reduce((sum, item) => sum + item.quantity * item.amountAtPayment, 0);

    const newPaymentRecord = await PaymentRecord.create({
      nameOfChild,
      classId,
      nameOfPayerOrCompany,
      dateOfPayment,
      modeOfPayment,
      otherModeOfPayment: modeOfPayment === "other" ? otherModeOfPayment : undefined,
      bankOrPaymentSourceName,
      term,
      session,
      items: itemsWithAmount,
      totalAmount,
      status: "pending",
    });

    return res.status(201).json({
      message: "Payment record created successfully",
      paymentRecord: newPaymentRecord,
    });
  } catch (error) {
    console.error("Error creating payment record:", error);
    if (!error.statusCode) error.statusCode = 500;
    return next(error);
  }
};

export const getAllPaymentRecords = async (req, res, next) => {
  const { status, classId, session, term, search, page = 1, limit = 20 } = req.query;

  try {
    const filter = {};
    if (status) filter.status = status;
    if (classId) filter.classId = classId;
    if (session) filter.session = session;
    if (term) filter.term = term;
    if (search) {
      filter.$or = [{ nameOfChild: { $regex: search, $options: "i" } }, { nameOfPayerOrCompany: { $regex: search, $options: "i" } }];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await PaymentRecord.countDocuments(filter);

    const paymentRecords = await PaymentRecord.find(filter)
      .populate("classId", "name")
      .populate("items.itemId", "name")
      .populate("acceptedBy", "fullName email")
      .populate("rejectedBy", "fullName email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    return res.status(200).json({
      message: "Payment records fetched successfully",
      count: paymentRecords.length,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      paymentRecords,
    });
  } catch (error) {
    console.error("Error fetching payment records:", error);
    if (!error.statusCode) error.statusCode = 500;
    return next(error);
  }
};

export const getPaymentRecordById = async (req, res, next) => {
  const { id } = req.params;
  if (!id) {
    const err = new Error("Payment record ID is required");
    err.statusCode = 400;
    return next(err);
  }

  try {
    const paymentRecord = await PaymentRecord.findById(id)
      .populate("classId", "name")
      .populate("items.itemId", "name")
      .populate("acceptedBy", "fullName email")
      .populate("rejectedBy", "fullName email");

    if (!paymentRecord) {
      const err = new Error("Payment record not found");
      err.statusCode = 404;
      return next(err);
    }

    const itemTransactions = await ItemTransaction.find({ paymentRecordId: paymentRecord._id })
      .populate("itemId", "name")
      .populate("staffIds", "fullName email");

    return res.status(200).json({
      message: "Payment record fetched successfully",
      paymentRecord,
      itemTransactions,
    });
  } catch (error) {
    console.error("Error fetching payment record:", error);
    if (!error.statusCode) error.statusCode = 500;
    return next(error);
  }
};

export const updatePaymentRecordById = async (req, res, next) => {
  const { id } = req.params;
  const { action, acceptedItemIds, rejectionReason } = req.body;

  if (!id || !action || !["accept", "reject"].includes(action)) {
    const err = new Error("Invalid request parameters");
    err.statusCode = 400;
    return next(err);
  }

  if (action === "accept" && (!acceptedItemIds || !Array.isArray(acceptedItemIds) || acceptedItemIds.length === 0)) {
    const err = new Error("acceptedItemIds is required for accept action");
    err.statusCode = 400;
    return next(err);
  }

  if (action === "reject" && !rejectionReason) {
    const err = new Error("rejectionReason is required for reject action");
    err.statusCode = 400;
    return next(err);
  }

  try {
    const paymentRecord = await PaymentRecord.findById(id);
    if (!paymentRecord) {
      const err = new Error("Payment record not found");
      err.statusCode = 404;
      return next(err);
    }

    // ── REJECT ALL PENDING ITEMS ─────────────────────────────────────
    if (action === "reject") {
      let hasPendingItems = false;

      paymentRecord.items.forEach((item) => {
        if (item.status === "pending") {
          item.status = "rejected";
          hasPendingItems = true;
        }
      });

      if (!hasPendingItems) {
        const err = new Error("No pending items to reject");
        err.statusCode = 400;
        return next(err);
      }

      paymentRecord.rejectionReason = rejectionReason;
      paymentRecord.rejectedAt = new Date();
      paymentRecord.rejectedBy = req.user.id;
      // Middleware will auto-calculate parent status based on final item states

      await paymentRecord.save();

      const populatedRecord = await PaymentRecord.findById(paymentRecord._id)
        .populate("classId", "name")
        .populate("items.itemId", "name")
        .populate("rejectedBy", "fullName email");

      return res.status(200).json({
        message: "Payment record rejected",
        paymentRecord: populatedRecord,
      });
    }

    // ── ACCEPT SELECTED ITEMS ───────────────────────────────────────
    const newlyAcceptedItems = [];

    paymentRecord.items.forEach((item) => {
      const isSelected = acceptedItemIds.includes(item._id.toString());
      if (isSelected && item.status === "pending") {
        item.status = "accepted";
        newlyAcceptedItems.push(item);
      }
    });

    // Do NOT manually set paymentRecord.status — middleware auto-calculates it
    paymentRecord.acceptedAt = new Date();
    paymentRecord.acceptedBy = req.user.id;

    await paymentRecord.save();

    // ── AUTO-CREATE ITEM TRANSACTIONS ──────────────────────────────
    const transactionDocs = [];

    for (const item of newlyAcceptedItems) {
      const roles = await Role.find({ itemIds: item.itemId });
      const roleIds = roles.map((r) => r._id);
      const staffMembers = await User.find({ roles: { $in: roleIds }, userType: "staff" });
      const staffIds = staffMembers.map((s) => s._id);

      transactionDocs.push({
        paymentRecordId: paymentRecord._id,
        itemId: item.itemId,
        quantity: item.quantity,
        amountAtPayment: item.amountAtPayment,
        staffIds,
        status: staffIds.length > 0 ? "pending" : "unassigned",
        statusHistory: [
          {
            status: staffIds.length > 0 ? "pending" : "unassigned",
            changedBy: req.user.id,
            changedAt: new Date(),
            reason: "Created on payment acceptance",
          },
        ],
      });
    }

    const createdTransactions = await ItemTransaction.insertMany(transactionDocs);

    const populatedRecord = await PaymentRecord.findById(paymentRecord._id)
      .populate("classId", "name")
      .populate("items.itemId", "name")
      .populate("acceptedBy", "fullName email");

    const populatedTransactions = await ItemTransaction.find({
      paymentRecordId: paymentRecord._id,
      _id: { $in: createdTransactions.map((t) => t._id) },
    })
      .populate("itemId", "name")
      .populate("staffIds", "fullName email");

    return res.status(200).json({
      message: "Payment record updated",
      paymentRecord: populatedRecord,
      createdTransactions: populatedTransactions,
    });
  } catch (error) {
    console.error("Error updating payment record:", error);
    if (!error.statusCode) error.statusCode = 500;
    return next(error);
  }
};
