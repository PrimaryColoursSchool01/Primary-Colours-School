import Class from "../models/class.model.js";
import Item from "../models/items-fess.model.js";
import Role from "../models/role.model.js";
import User from "../models/user.model.js";
import PaymentRecord from "../models/payment-record.model.js";
import ItemTransaction from "../models/item-transaction.model.js";
import Section from "../models/section.model.js";

export const getAllClasses = async (req, res, next) => {
  try {
    const classes = await Class.find({}).populate("sectionId", "name").sort({ name: 1 });
    return res.status(200).json({ message: "Classes fetched successfully", classes });
  } catch (error) {
    console.error("Error fetching classes:", error);
    if (!error.statusCode) error.statusCode = 500;
    return next(error);
  }
};

export const createClass = async (req, res, next) => {
  const { name, sectionId } = req.body;
  if (!name || !sectionId) {
    const err = new Error("Class name and section ID are required");
    err.statusCode = 400;
    return next(err);
  }
  try {
    const existingClassWithName = await Class.findOne({ name });
    if (existingClassWithName) {
      const err = new Error("Another class with the same name already exists");
      err.statusCode = 400;
      return next(err);
    }
    const newClass = await Class.create({ name, sectionId });
    return res.status(201).json({ message: "Class created successfully", class: newClass });
  } catch (error) {
    console.error("Error creating class:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getClassById = async (req, res, next) => {
  const { id } = req.params;
  if (!id) {
    const err = new Error("Class ID is required");
    err.statusCode = 400;
    return next(err);
  }
  try {
    const savedClass = await Class.findById(id).populate("sectionId", "name");
    if (!savedClass) {
      const err = new Error("Class not found");
      err.statusCode = 404;
      return next(err);
    }
    return res.status(200).json({ message: "Class fetched successfully", class: savedClass });
  } catch (error) {
    console.error("Error fetching class:", error);
    return next(error);
  }
};

export const updateClassById = async (req, res, next) => {
  const { id } = req.params;
  const { name } = req.body;
  if (!id) {
    const err = new Error("Class ID is required");
    err.statusCode = 400;
    return next(err);
  }
  if (!name) {
    const err = new Error("New class name is required");
    err.statusCode = 400;
    return next(err);
  }
  try {
    const existingClassWithName = await Class.findOne({ name });
    if (existingClassWithName && existingClassWithName._id.toString() !== id) {
      const err = new Error("Another class with the same name already exists");
      err.statusCode = 400;
      return next(err);
    }
    const updatedClass = await Class.findByIdAndUpdate(id, { name }, { new: true }).populate("sectionId", "name");
    if (!updatedClass) {
      const err = new Error("Class not found");
      err.statusCode = 404;
      return next(err);
    }
    return res.status(200).json({ message: "Class updated successfully", class: updatedClass });
  } catch (error) {
    console.error("Error updating class:", error);
    return next(error);
  }
};

export const deleteClassById = async (req, res, next) => {
  const { id } = req.params;
  if (!id) {
    const err = new Error("Class ID is required");
    err.statusCode = 400;
    return next(err);
  }

  try {
    const existingClass = await Class.findById(id);
    if (!existingClass) {
      const err = new Error("Class not found");
      err.statusCode = 404;
      return next(err);
    }

    // HARD BLOCK 1: payment records reference this class
    const paymentRecordCount = await PaymentRecord.countDocuments({ classId: id });
    if (paymentRecordCount > 0) {
      const err = new Error(`Cannot delete class: ${paymentRecordCount} payment record(s) reference this class`);
      err.statusCode = 400;
      return next(err);
    }

    // HARD BLOCK 2: items that would become orphaned and have transactions
    const affectedItems = await Item.find({ scope: "class", classIds: id });
    const wouldBeOrphanedItems = affectedItems.filter((item) => item.classIds.length === 1);

    if (wouldBeOrphanedItems.length > 0) {
      const orphanedItemIds = wouldBeOrphanedItems.map((i) => i._id);
      const transactionCount = await ItemTransaction.countDocuments({
        itemId: { $in: orphanedItemIds },
      });
      if (transactionCount > 0) {
        const err = new Error(`Cannot delete class: ${transactionCount} transaction(s) reference items that would be removed`);
        err.statusCode = 400;
        return next(err);
      }
    }

    // Delete the class itself
    await Class.findByIdAndDelete(id);

    // Soft cleanup: remove class from items that reference it
    await Item.updateMany({ classIds: id }, { $pull: { classIds: id } });

    // Find items that will be deleted (orphaned class-scoped items)
    const itemsToDelete = await Item.find({ scope: "class", classIds: { $size: 0 } });
    const deletedItemIds = itemsToDelete.map((item) => item._id.toString());

    // Delete orphaned items
    await Item.deleteMany({ scope: "class", classIds: { $size: 0 } });

    // --- NEW: Clean up roles that referenced the deleted items ---
    if (deletedItemIds.length > 0) {
      await Role.updateMany({ itemIds: { $in: deletedItemIds } }, { $pull: { itemIds: { $in: deletedItemIds } } });

      const emptyRoles = await Role.find({ itemIds: { $size: 0 } });
      const emptyRoleIds = emptyRoles.map((r) => r._id);

      if (emptyRoleIds.length > 0) {
        await User.updateMany({ roles: { $in: emptyRoleIds } }, { $pull: { roles: { $in: emptyRoleIds } } });
        await Role.deleteMany({ _id: { $in: emptyRoleIds } });
      }
    }

    return res.status(200).json({ message: "Class deleted successfully", class: existingClass });
  } catch (error) {
    console.error("Error deleting class:", error);
    return next(error);
  }
};
