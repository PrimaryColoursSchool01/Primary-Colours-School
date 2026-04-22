import Section from "../models/section.model.js";
import Class from "../models/class.model.js";
import Item from "../models/items-fess.model.js";
import Role from "../models/role.model.js";
import User from "../models/user.model.js";
import PaymentRecord from "../models/payment-record.model.js";
import ItemTransaction from "../models/item-transaction.model.js";

// ─── SECTION CONTROLLERS ─────────────────────────────────────────────────────
export const getAllSections = async (req, res, next) => {
  try {
    const sections = await Section.find({}).select("name createdAt").sort({ name: 1 }).lean();

    const sectionsWithClasses = await Promise.all(
      sections.map(async (section) => {
        const classes = await Class.find({ sectionId: section._id }).sort({ name: 1 }).select("_id name").lean();
        return { ...section, classes };
      }),
    );

    return res.status(200).json({
      message: "Sections fetched successfully",
      sections: sectionsWithClasses,
    });
  } catch (error) {
    console.error("Error fetching sections:", error);
    if (!error.statusCode) error.statusCode = 500;
    return next(error);
  }
};

export const createSection = async (req, res, next) => {
  const { name } = req.body;
  if (!name) {
    const err = new Error("Section name is required");
    err.statusCode = 400;
    return next(err);
  }

  try {
    const newSection = await Section.create({ name });
    return res.status(201).json({ message: "Section created successfully", section: newSection });
  } catch (error) {
    console.error("Error creating section:", error);
    if (!error.statusCode) error.statusCode = 500;
    return next(error);
  }
};

export const getSectionById = async (req, res, next) => {
  const { id } = req.params;
  if (!id) {
    const err = new Error("Section ID is required");
    err.statusCode = 400;
    return next(err);
  }

  try {
    const section = await Section.findById(id);
    if (!section) {
      const err = new Error("Section not found");
      err.statusCode = 404;
      return next(err);
    }
    return res.status(200).json({ message: "Section fetched successfully", section });
  } catch (error) {
    console.error("Error fetching section:", error);
    if (!error.statusCode) error.statusCode = 500;
    return next(error);
  }
};

export const updateSectionById = async (req, res, next) => {
  const { id } = req.params;
  const { name } = req.body;
  if (!id) {
    const err = new Error("Section ID is required");
    err.statusCode = 400;
    return next(err);
  }
  if (!name) {
    const err = new Error("Section name is required");
    err.statusCode = 400;
    return next(err);
  }

  try {
    const updatedSection = await Section.findByIdAndUpdate(id, { name }, { new: true });
    if (!updatedSection) {
      const err = new Error("Section not found");
      err.statusCode = 404;
      return next(err);
    }
    return res.status(200).json({ message: "Section updated successfully", section: updatedSection });
  } catch (error) {
    console.error("Error updating section:", error);
    if (!error.statusCode) error.statusCode = 500;
    return next(error);
  }
};

export const deleteSectionById = async (req, res, next) => {
  const { id } = req.params;
  if (!id) {
    const err = new Error("Section ID is required");
    err.statusCode = 400;
    return next(err);
  }

  try {
    const existingSection = await Section.findById(id);
    if (!existingSection) {
      const err = new Error("Section not found");
      err.statusCode = 404;
      return next(err);
    }

    //  HARD BLOCK 1: payment records in classes under this section
    const classes = await Class.find({ sectionId: id });
    const classIds = classes.map((c) => c._id);

    if (classIds.length > 0) {
      const paymentRecordCount = await PaymentRecord.countDocuments({
        classId: { $in: classIds },
      });
      if (paymentRecordCount > 0) {
        const err = new Error(`Cannot delete section: ${paymentRecordCount} payment record(s) exist in classes under this section`);
        err.statusCode = 400;
        return next(err);
      }
    }

    //  HARD BLOCK 2: transactions on items scoped to this section
    //  REUSE sectionItems — no need to query again later
    const sectionItems = await Item.find({ sectionId: id });
    const sectionItemIds = sectionItems.map((i) => i._id);

    if (sectionItemIds.length > 0) {
      const transactionCount = await ItemTransaction.countDocuments({
        itemId: { $in: sectionItemIds },
      });
      if (transactionCount > 0) {
        const err = new Error(`Cannot delete section: ${transactionCount} transaction(s) reference items in this section`);
        err.statusCode = 400;
        return next(err);
      }
    }

    // ── All checks passed — safe to delete ──────────────────────

    await Section.findByIdAndDelete(id);
    await Class.deleteMany({ sectionId: id });

    //  FIX: Clean up stale sectionId and classIds on roles
    await Role.updateMany(
      { sectionId: id },
      {
        $unset: { sectionId: "" },
        $pull: { classIds: { $in: classIds } },
      },
    );

    //  REUSE sectionItemIds from above — no redundant query
    const deletedItemIds = sectionItemIds;

    await Item.deleteMany({ sectionId: id });

    // Clean up roles that referenced the deleted items
    if (deletedItemIds.length > 0) {
      await Role.updateMany({ itemIds: { $in: deletedItemIds } }, { $pull: { itemIds: { $in: deletedItemIds } } });

      // Find roles that are now completely empty
      const emptyRoles = await Role.find({ itemIds: { $size: 0 } });
      const emptyRoleIds = emptyRoles.map((r) => r._id);

      if (emptyRoleIds.length > 0) {
        await User.updateMany({ roles: { $in: emptyRoleIds } }, { $pull: { roles: { $in: emptyRoleIds } } });
        await Role.deleteMany({ _id: { $in: emptyRoleIds } });
      }
    }

    return res.status(200).json({ message: "Section deleted successfully", section: existingSection });
  } catch (error) {
    console.error("Error deleting section:", error);
    return next(error);
  }
};
