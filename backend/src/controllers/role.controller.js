// controllers/roles.controller.js
import Role from "../models/role.model.js";
import User from "../models/user.model.js";
import ItemTransaction from "../models/item-transaction.model.js";
import Item from "../models/items-fess.model.js";
import Class from "../models/class.model.js";
import Section from "../models/section.model.js";

const autoAssignStuckTransactions = async (role, changedBy) => {
  if (!role.itemIds?.length) return;

  //  FIXED: Handle both raw ObjectIds and populated document objects
  const linkedItemIds = role.itemIds.map((i) => i._id ?? i);

  const staffWithRole = await User.find({
    roles: { $in: [role._id] },
    userType: "staff",
    status: "active",
  }).select("_id");

  if (staffWithRole.length === 0) return;

  const staffIds = staffWithRole.map((s) => s._id);

  const result = await ItemTransaction.updateMany(
    {
      itemId: { $in: linkedItemIds },
      status: { $in: ["no_role", "no_staff"] },
    },
    {
      $set: {
        status: "pending",
        staffIds: staffIds,
      },
      $push: {
        statusHistory: {
          status: "pending",
          changedBy: changedBy || null,
          changedAt: new Date(),
          reason: "Auto-assigned: Role created/updated with active staff",
        },
      },
    },
  );

  if (result.modifiedCount > 0) {
    console.log(`🔄 Auto-assigned ${result.modifiedCount} transactions for role "${role.name}" to ${staffIds.length} staff members`);
  }
};

export const getAllRoles = async (req, res, next) => {
  try {
    const roles = await Role.find({})
      .populate("sectionId", "name")
      .populate("classIds", "name")
      .populate("itemIds", "name")
      .sort({ createdAt: -1 });
    return res.status(200).json({ message: "Roles fetched successfully", roles });
  } catch (error) {
    console.error("Error fetching roles:", error);
    if (!error.statusCode) error.statusCode = 500;
    return next(error);
  }
};

export const createRole = async (req, res, next) => {
  const { name, selectionType, sectionId, classIds, itemIds } = req.body;

  if (!name) {
    const err = new Error("Role name is required");
    err.statusCode = 400;
    return next(err);
  }

  if (!selectionType) {
    const err = new Error("Selection type is required");
    err.statusCode = 400;
    return next(err);
  }

  if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
    const err = new Error("At least one item is required");
    err.statusCode = 400;
    return next(err);
  }

  try {
    let scope;
    let finalSectionId = null;
    let finalClassIds = [];

    switch (selectionType) {
      case "all-sections":
        scope = "global";
        break;
      case "section-all-classes":
        scope = "section";
        if (!sectionId) {
          const err = new Error("Section ID is required for section-all-classes");
          err.statusCode = 400;
          return next(err);
        }
        finalSectionId = sectionId;
        break;
      case "section-specific-classes":
        scope = "class";
        if (!sectionId) {
          const err = new Error("Section ID is required for section-specific-classes");
          err.statusCode = 400;
          return next(err);
        }
        if (!classIds || !Array.isArray(classIds) || classIds.length === 0) {
          const err = new Error("At least one class ID is required for section-specific-classes");
          err.statusCode = 400;
          return next(err);
        }
        finalSectionId = sectionId;
        finalClassIds = classIds;
        break;
      default:
        const err = new Error("Invalid selection type");
        err.statusCode = 400;
        return next(err);
    }

    const newRole = await Role.create({
      name,
      scope,
      sectionId: finalSectionId,
      classIds: finalClassIds,
      itemIds,
    });

    // NEW: Auto-assign stuck transactions for this role
    await autoAssignStuckTransactions(newRole, req.user?.id);

    return res.status(201).json({ message: "Role created successfully", role: newRole });
  } catch (error) {
    console.error("Error creating role:", error);
    if (!error.statusCode) error.statusCode = 500;
    return next(error);
  }
};

export const getRoleById = async (req, res, next) => {
  const { id } = req.params;

  if (!id) {
    const err = new Error("Role ID is required");
    err.statusCode = 400;
    return next(err);
  }

  try {
    const role = await Role.findById(id).populate("sectionId", "name").populate("classIds", "name").populate("itemIds", "name");

    if (!role) {
      const err = new Error("Role not found");
      err.statusCode = 404;
      return next(err);
    }

    return res.status(200).json({ message: "Role fetched successfully", role });
  } catch (error) {
    console.error("Error fetching role:", error);
    if (!error.statusCode) error.statusCode = 500;
    return next(error);
  }
};

export const updateRoleById = async (req, res, next) => {
  const { id } = req.params;
  const { name, selectionType, sectionId, classIds, itemIds } = req.body;

  if (!id) {
    const err = new Error("Role ID is required");
    err.statusCode = 400;
    return next(err);
  }

  try {
    const currentRole = await Role.findById(id);
    if (!currentRole) {
      const err = new Error("Role not found");
      err.statusCode = 404;
      return next(err);
    }

    const updateData = {};

    if (name !== undefined) {
      updateData.name = name;
    }

    if (itemIds !== undefined) {
      if (!Array.isArray(itemIds) || itemIds.length === 0) {
        const err = new Error("At least one item is required");
        err.statusCode = 400;
        return next(err);
      }
      updateData.itemIds = itemIds;
    }

    if (selectionType !== undefined) {
      let scope;
      let finalSectionId = null;
      let finalClassIds = [];

      switch (selectionType) {
        case "all-sections":
          scope = "global";
          finalSectionId = null;
          finalClassIds = [];
          break;
        case "section-all-classes":
          scope = "section";
          if (!sectionId) {
            const err = new Error("Section ID is required for section-all-classes");
            err.statusCode = 400;
            return next(err);
          }
          finalSectionId = sectionId;
          finalClassIds = [];
          break;
        case "section-specific-classes":
          scope = "class";
          if (!sectionId) {
            const err = new Error("Section ID is required for section-specific-classes");
            err.statusCode = 400;
            return next(err);
          }
          if (!classIds || !Array.isArray(classIds) || classIds.length === 0) {
            const err = new Error("At least one class ID is required for section-specific-classes");
            err.statusCode = 400;
            return next(err);
          }
          finalSectionId = sectionId;
          finalClassIds = classIds;
          break;
        default:
          const err = new Error("Invalid selection type");
          err.statusCode = 400;
          return next(err);
      }

      updateData.scope = scope;
      updateData.sectionId = finalSectionId;
      updateData.classIds = finalClassIds;
    } else {
      if (currentRole.scope === "section" || currentRole.scope === "class") {
        if (sectionId !== undefined) {
          updateData.sectionId = sectionId;
        }
      }
      if (currentRole.scope === "class" && classIds !== undefined) {
        if (!Array.isArray(classIds) || classIds.length === 0) {
          const err = new Error("At least one class ID is required for class scope roles");
          err.statusCode = 400;
          return next(err);
        }
        updateData.classIds = classIds;
      }
    }

    const updatedRole = await Role.findByIdAndUpdate(id, updateData, { new: true })
      .populate("sectionId", "name")
      .populate("classIds", "name")
      .populate("itemIds", "name");

    // NEW: If itemIds changed, auto-assign stuck transactions
    if (itemIds !== undefined) {
      await autoAssignStuckTransactions(updatedRole, req.user?.id);
    }

    return res.status(200).json({ message: "Role updated successfully", role: updatedRole });
  } catch (error) {
    console.error("Error updating role:", error);
    if (!error.statusCode) error.statusCode = 500;
    return next(error);
  }
};

export const deleteRoleById = async (req, res, next) => {
  const { id } = req.params;

  if (!id) {
    const err = new Error("Role ID is required");
    err.statusCode = 400;
    return next(err);
  }

  try {
    const role = await Role.findById(id);
    if (!role) {
      const err = new Error("Role not found");
      err.statusCode = 404;
      return next(err);
    }

    const affectedUsers = await User.countDocuments({ roles: id });
    const roleItemIds = role.itemIds || [];

    await Role.findByIdAndDelete(id);

    // Soft cleanup: remove role from all users
    await User.updateMany({ roles: id }, { $pull: { roles: id } });

    //  Soft cleanup: re-route ItemTransactions for items that belonged to this role
    if (roleItemIds.length > 0) {
      for (const itemId of roleItemIds) {
        const otherRoles = await Role.find({ itemIds: itemId });

        if (otherRoles.length === 0) {
          // No other role covers this item — transactions go back to no_role
          await ItemTransaction.updateMany(
            { itemId, status: { $in: ["pending", "no_staff"] } },
            {
              $set: { status: "no_role", staffIds: [] },
              $push: {
                statusHistory: {
                  status: "no_role",
                  changedBy: req.user?.id || null,
                  changedAt: new Date(),
                  reason: "Role deleted — item has no remaining assigned role",
                },
              },
            },
          );
        } else {
          // Other roles exist — re-evaluate remaining staff
          const otherRoleIds = otherRoles.map((r) => r._id);
          const remainingStaff = await User.find({
            roles: { $in: otherRoleIds },
            userType: "staff",
            status: "active",
          }).select("_id");

          if (remainingStaff.length === 0) {
            await ItemTransaction.updateMany(
              { itemId, status: { $in: ["pending", "no_role"] } },
              {
                $set: { status: "no_staff", staffIds: [] },
                $push: {
                  statusHistory: {
                    status: "no_staff",
                    changedBy: req.user?.id || null,
                    changedAt: new Date(),
                    reason: "Role deleted — remaining roles have no active staff",
                  },
                },
              },
            );
          } else {
            // Update staffIds to reflect remaining staff only
            await ItemTransaction.updateMany({ itemId, status: "pending" }, { $set: { staffIds: remainingStaff.map((s) => s._id) } });
          }
        }
      }
    }

    return res.status(200).json({
      message: "Role deleted successfully",
      role,
      affectedUsers,
    });
  } catch (error) {
    console.error("Error deleting role:", error);
    if (!error.statusCode) error.statusCode = 500;
    return next(error);
  }
};

export const getRoleDependencies = async (req, res, next) => {
  const { id } = req.params;

  try {
    const role = await Role.findById(id);
    if (!role) {
      const err = new Error("Role not found");
      err.statusCode = 404;
      return next(err);
    }

    const userCount = await User.countDocuments({ roles: id });

    return res.status(200).json({
      success: true,
      data: {
        users: userCount,
        items: role.itemIds?.length || 0,
      },
    });
  } catch (error) {
    console.error("Error fetching dependencies:", error);
    next(error);
  }
};
