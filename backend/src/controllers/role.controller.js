import Role from "../models/role.model.js";

export const getAllRoles = async (req, res, next) => {
  try {
    const roles = await Role.find({}).sort({ name: 1 });
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
    const role = await Role.findById(id)
      .populate("sectionId")
      .populate("classIds")
      .populate("itemIds");

    if (!role) {
      const err = new Error("Role not found");
      err.statusCode = 404;
      return next(err);
    }

    return res.status(200).json({ role });
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
      .populate("sectionId")
      .populate("classIds")
      .populate("itemIds");

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
    const deletedRole = await Role.findByIdAndDelete(id);
    if (!deletedRole) {
      const err = new Error("Role not found");
      err.statusCode = 404;
      return next(err);
    }

    return res.status(200).json({ message: "Role deleted successfully", role: deletedRole });
  } catch (error) {
    console.error("Error deleting role:", error);
    if (!error.statusCode) error.statusCode = 500;
    return next(error);
  }
};
