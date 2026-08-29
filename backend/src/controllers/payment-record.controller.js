import PaymentRecord from "../models/payment-record.model.js";
import ItemTransaction from "../models/item-transaction.model.js";
import Role from "../models/role.model.js";
import User from "../models/user.model.js";
import Class from "../models/class.model.js";
import Item from "../models/items-fess.model.js";
import sharp from "sharp";

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
    // ── Payment Evidence Fields (FLAT schema) ─────────────────
    paymentEvidenceType,
    paymentEvidenceText,
  } = req.body;

  //  FIX 1: Parse items if it's a JSON string (from FormData)
  let parsedItems = items;
  if (typeof items === "string") {
    try {
      parsedItems = JSON.parse(items);
    } catch (e) {
      const err = new Error("Invalid items format");
      err.statusCode = 400;
      return next(err);
    }
  }

  //  FIX 2: Ensure quantities are numbers (FormData sends strings)
  parsedItems = parsedItems.map((item) => ({
    ...item,
    quantity: Number(item.quantity),
  }));

  // ── Existing Validation ─────────────────────────────────────
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

  if (!parsedItems || !Array.isArray(parsedItems) || parsedItems.length === 0) {
    const err = new Error("At least one item is required");
    err.statusCode = 400;
    return next(err);
  }

  for (const item of parsedItems) {
    if (!item.itemId || !item.quantity || item.quantity < 1) {
      const err = new Error("Each item must have a valid itemId and quantity");
      err.statusCode = 400;
      return next(err);
    }
  }

  // ── Payment Evidence Validation (FLAT fields) ───────────────
  if (!paymentEvidenceType || !["text", "image"].includes(paymentEvidenceType)) {
    const err = new Error("Payment evidence type is required");
    err.statusCode = 400;
    return next(err);
  }

  if (paymentEvidenceType === "text" && !paymentEvidenceText?.trim()) {
    const err = new Error("Payment reference is required for text evidence");
    err.statusCode = 400;
    return next(err);
  }

  // ── Handle Image: Compress with sharp → Buffer ──────────────
  let paymentEvidenceImage = null;
  let paymentEvidenceContentType = null;

  if (paymentEvidenceType === "image" && req.file) {
    try {
      // Compress: 800px max width, 60% quality, JPEG output
      const compressed = await sharp(req.file.buffer)
        .resize({ width: 800, withoutEnlargement: true })
        .jpeg({ quality: 60, progressive: true })
        .toBuffer();

      // Hard size guard: 300KB max after compression
      if (compressed.length > 300 * 1024) {
        const err = new Error("Image too large after compression. Please use a smaller photo.");
        err.statusCode = 400;
        return next(err);
      }

      paymentEvidenceImage = compressed;
      paymentEvidenceContentType = "image/jpeg";
    } catch (error) {
      console.error("Sharp compression failed:", error);
      const err = new Error("Failed to process image. Please try a different photo.");
      err.statusCode = 400;
      return next(err);
    }
  } else if (paymentEvidenceType === "image" && !req.file) {
    const err = new Error("Image file is required for image evidence");
    err.statusCode = 400;
    return next(err);
  }

  try {
    // ── Existing Class/Item Validation ─────────────────────────
    const existingClass = await Class.findById(classId);
    if (!existingClass) {
      const err = new Error("Class not found");
      err.statusCode = 404;
      return next(err);
    }

    const itemIds = parsedItems.map((item) => item.itemId);
    const existingItems = await Item.find({ _id: { $in: itemIds } });
    if (existingItems.length !== itemIds.length) {
      const err = new Error("One or more items do not exist");
      err.statusCode = 404;
      return next(err);
    }

    const itemsWithAmount = parsedItems.map((item) => {
      const dbItem = existingItems.find((i) => i._id.toString() === item.itemId.toString());
      return {
        itemId: item.itemId,
        quantity: item.quantity,
        amountAtPayment: dbItem.price,
        status: "pending",
      };
    });

    const totalAmount = itemsWithAmount.reduce((sum, item) => sum + item.quantity * item.amountAtPayment, 0);

    // ── Build FLAT Payment Evidence Fields ────────────────────
    // Match the flat schema fields exactly
    const evidenceFields = {
      paymentEvidenceType,
      paymentEvidenceUploadedAt: new Date(),
    };

    if (paymentEvidenceType === "text") {
      evidenceFields.paymentEvidenceText = paymentEvidenceText.trim();
    } else {
      evidenceFields.paymentEvidenceImage = paymentEvidenceImage;
      evidenceFields.paymentEvidenceContentType = paymentEvidenceContentType;
    }

    // ── Create Payment Record ─────────────────────────────────
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
      ...evidenceFields, // ← Spread flat evidence fields
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
  const { status, classId, startDate, endDate, search, page = 1, limit = 20 } = req.query; // Removed 'session' and 'term'

  try {
    const filter = {};

    if (status && status !== "all") filter.status = status;
    if (classId) filter.classId = new mongoose.Types.ObjectId(classId);

    // ── NEW: Date Range Filter ─────────────────────────────────────
    if (startDate || endDate) {
      filter.dateOfPayment = {};
      if (startDate) filter.dateOfPayment.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setUTCHours(23, 59, 59, 999); // Include entire end day
        filter.dateOfPayment.$lte = end;
      }
    }

    // Search filter (independent)
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
  const { action, acceptedItemIds, rejectionReason, amountReceived } = req.body;

  if (!id || !action || !["accept", "reject", "update-amount"].includes(action)) {
    const err = new Error("Invalid request parameters");
    err.statusCode = 400;
    return next(err);
  }

  // amountReceived is required for accept only when not provided as undefined
  if (action !== "reject" && action !== "update-amount") {
    if (amountReceived !== undefined && amountReceived !== null && amountReceived !== "") {
      if (isNaN(Number(amountReceived)) || Number(amountReceived) < 0) {
        const err = new Error("Amount received must be a valid positive number");
        err.statusCode = 400;
        return next(err);
      }
    }
  } else if (action === "update-amount") {
    if (amountReceived === undefined || amountReceived === null || amountReceived === "") {
      const err = new Error("Amount received is required");
      err.statusCode = 400;
      return next(err);
    }
    if (isNaN(Number(amountReceived)) || Number(amountReceived) < 0) {
      const err = new Error("Amount received must be a valid positive number");
      err.statusCode = 400;
      return next(err);
    }
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

    // ── UPDATE AMOUNT ONLY (no item status changes) ───────────────────
    if (action === "update-amount") {
      const currentReceived = paymentRecord.amountReceived || 0;
      const newTotal = currentReceived + Number(amountReceived);

      if (newTotal > paymentRecord.totalAmount) {
        const remaining = paymentRecord.totalAmount - currentReceived;
        const err = new Error(
          `Amount entered would exceed the total payment. Already received: ₦${currentReceived.toLocaleString()}. Maximum you can enter now: ₦${remaining.toLocaleString()}.`
        );
        err.statusCode = 400;
        return next(err);
      }

      paymentRecord.amountReceived = newTotal;
      await paymentRecord.save();

      const populatedRecord = await PaymentRecord.findById(paymentRecord._id)
        .populate("classId", "name")
        .populate("items.itemId", "name");

      return res.status(200).json({
        message: "Payment amount updated",
        paymentRecord: populatedRecord,
      });
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
      paymentRecord.amountReceived = (paymentRecord.amountReceived || 0) + Number(amountReceived);
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
    // Only accumulate amountReceived if it was provided (debt not yet cleared)
    if (amountReceived !== undefined && amountReceived !== null && amountReceived !== "") {
      const currentReceived = paymentRecord.amountReceived || 0;
      const newTotal = currentReceived + Number(amountReceived);

      if (newTotal > paymentRecord.totalAmount) {
        const remaining = paymentRecord.totalAmount - currentReceived;
        const err = new Error(
          `Amount entered would exceed the total payment. Already received: ₦${currentReceived.toLocaleString()}. Maximum you can enter now: ₦${remaining.toLocaleString()}.`
        );
        err.statusCode = 400;
        return next(err);
      }

      paymentRecord.amountReceived = newTotal;
    }

    await paymentRecord.save();

    // ── AUTO-CREATE ITEM TRANSACTIONS ──────────────────────────────
    const transactionDocs = [];

    for (const item of newlyAcceptedItems) {
      // 1. Find roles assigned to this item
      const roles = await Role.find({ itemIds: item.itemId });
      const roleIds = roles.map((r) => r._id);

      // 2. Find active staff in those roles
      let staffMembers = await User.find({
        roles: { $in: roleIds },
        userType: "staff",
        status: "active", // Only include active staff
      });
      let staffIds = staffMembers.map((s) => s._id);

      // 3. Determine SPECIFIC status and reason
      let status, reason;

      if (roles.length === 0) {
        // Case A: Item has no assigned role
        status = "no_role";
        reason = "Item has no assigned role";
      } else if (staffIds.length === 0) {
        // Case B: Item has roles but no active staff
        status = "no_staff";
        reason = `Assigned role(s) have no active staff: ${roles.map((r) => r.name).join(", ")}`;
      } else {
        // Case C: Normal routing
        status = "pending";
        reason = "Auto-assigned on payment acceptance";
      }

      transactionDocs.push({
        paymentRecordId: paymentRecord._id,
        itemId: item.itemId,
        quantity: item.quantity,
        amountAtPayment: item.amountAtPayment,
        staffIds, // Empty array for no_role/no_staff
        status, //  Now specific: "no_role", "no_staff", or "pending"
        statusHistory: [
          {
            status,
            changedBy: req.user.id,
            changedAt: new Date(),
            reason, //  Clear audit trail
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
