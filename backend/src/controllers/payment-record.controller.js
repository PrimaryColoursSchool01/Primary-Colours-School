import PaymentRecord from "../models/payment-record.model.js";
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

  // Basic field validation
  if (!nameOfChild) {
    const err = new Error("Name of child is required");
    err.statusCode = 400;
    return next(err);
  }

  if (!classId) {
    const err = new Error("Class is required");
    err.statusCode = 400;
    return next(err);
  }

  if (!nameOfPayerOrCompany) {
    const err = new Error("Name of payer or company is required");
    err.statusCode = 400;
    return next(err);
  }

  if (!dateOfPayment) {
    const err = new Error("Date of payment is required");
    err.statusCode = 400;
    return next(err);
  }

  if (!modeOfPayment) {
    const err = new Error("Mode of payment is required");
    err.statusCode = 400;
    return next(err);
  }

  if (modeOfPayment === "other" && !otherModeOfPayment) {
    const err = new Error("Please specify your mode of payment");
    err.statusCode = 400;
    return next(err);
  }

  if (!bankOrPaymentSourceName) {
    const err = new Error("Bank or payment source name is required");
    err.statusCode = 400;
    return next(err);
  }

  if (!session) {
    const err = new Error("Session is required");
    err.statusCode = 400;
    return next(err);
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    const err = new Error("At least one item is required");
    err.statusCode = 400;
    return next(err);
  }

  // Validate each item structure
  for (const item of items) {
    if (!item.itemId) {
      const err = new Error("Each item must have an itemId");
      err.statusCode = 400;
      return next(err);
    }
    if (!item.quantity || item.quantity < 1) {
      const err = new Error("Each item must have a valid quantity");
      err.statusCode = 400;
      return next(err);
    }
  }

  try {
    // Validate class exists
    const existingClass = await Class.findById(classId);
    if (!existingClass) {
      const err = new Error("Class not found");
      err.statusCode = 404;
      return next(err);
    }

    // Validate all itemIds exist in the DB
    const itemIds = items.map((item) => item.itemId);
    const existingItems = await Item.find({ _id: { $in: itemIds } });

    if (existingItems.length !== itemIds.length) {
      const err = new Error("One or more items do not exist");
      err.statusCode = 404;
      return next(err);
    }

    // Build items array using prices from the DB
    const itemsWithAmount = items.map((item) => {
      const dbItem = existingItems.find((i) => i._id.toString() === item.itemId.toString());
      return {
        itemId: item.itemId,
        quantity: item.quantity,
        amountAtPayment: dbItem.price,
      };
    });

    // Calculate total amount using prices from the DB
    const totalAmount = itemsWithAmount.reduce((sum, item) => {
      return sum + item.quantity * item.amountAtPayment;
    }, 0);

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
  const { status, classId, session, term, search } = req.query;

  try {
    const filter = {};

    if (status) {
      filter.status = status;
    }

    if (classId) {
      filter.classId = classId;
    }

    if (session) {
      filter.session = session;
    }

    if (term) {
      filter.term = term;
    }

    if (search) {
      filter.$or = [
        { nameOfChild: { $regex: search, $options: "i" } },
        { nameOfPayerOrCompany: { $regex: search, $options: "i" } },
      ];
    }

    const paymentRecords = await PaymentRecord.find(filter)
      .populate("classId")
      .populate("items.itemId")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      message: "Payment records fetched successfully",
      count: paymentRecords.length,
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
      .populate("classId")
      .populate("items.itemId");

    if (!paymentRecord) {
      const err = new Error("Payment record not found");
      err.statusCode = 404;
      return next(err);
    }

    return res.status(200).json({
      message: "Payment record fetched successfully",
      paymentRecord,
    });
  } catch (error) {
    console.error("Error fetching payment record:", error);
    if (!error.statusCode) error.statusCode = 500;
    return next(error);
  }
};

export const updatePaymentRecordById = async (req, res, next) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!id) {
    const err = new Error("Payment record ID is required");
    err.statusCode = 400;
    return next(err);
  }

  if (!status) {
    const err = new Error("Status is required");
    err.statusCode = 400;
    return next(err);
  }

  if (!["pending", "accepted", "rejected"].includes(status)) {
    const err = new Error("Invalid status");
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

    paymentRecord.status = status;
    await paymentRecord.save();

    return res.status(200).json({
      message: "Payment record status updated successfully",
      paymentRecord,
    });
  } catch (error) {
    console.error("Error updating payment record:", error);
    if (!error.statusCode) error.statusCode = 500;
    return next(error);
  }
};
