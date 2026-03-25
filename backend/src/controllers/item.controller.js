import Item from "../models/items-fess.model.js";
import Section from "../models/section.model.js";
import Class from "../models/class.model.js";
import Role from "../models/role.model.js";

// ─── Helper: Transform item for frontend ─────────────────────────────────────

function transformItemForFrontend(item) {
  return {
    _id: item._id,
    name: item.name,
    price: item.price,
    compulsory: item.compulsory,
    scope: item.scope,
    sectionId: item.sectionId?._id || null,
    sectionName: item.sectionId?.name || "All Sections",
    classIds: item.classIds?.map((c) => c._id) || [],
    classNames: item.classIds?.map((c) => c.name) || [],
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

// ─── Get All Items ───────────────────────────────────────────────────────────

export const getAllItems = async (req, res, next) => {
  try {
    const items = await Item.find({}).populate("sectionId", "name").populate("classIds", "name").sort({ createdAt: -1 });

    const transformedItems = items.map(transformItemForFrontend);

    return res.status(200).json({
      success: true,
      message: "Items fetched successfully",
      data: transformedItems,
    });
  } catch (error) {
    console.error("Error fetching items:", error);
    next(error);
  }
};

// ─── Create Item ─────────────────────────────────────────────────────────────

export const createItem = async (req, res, next) => {
  const { name, price, compulsory, scope, sectionId, classIds } = req.body;

  // Validation: Name
  if (!name || name.trim().length < 2) {
    const err = new Error("Item name must be at least 2 characters");
    err.statusCode = 400;
    return next(err);
  }

  // Validation: Price
  if (price === undefined || isNaN(price) || price < 0) {
    const err = new Error("Price must be a valid positive number");
    err.statusCode = 400;
    return next(err);
  }

  // Validation: Scope
  if (!scope || !["global", "section", "class"].includes(scope)) {
    const err = new Error("Invalid scope. Must be: global, section, or class");
    err.statusCode = 400;
    return next(err);
  }

  // Scope-dependent validation
  let finalSectionId = null;
  let finalClassIds = [];

  if (scope === "section" || scope === "class") {
    if (!sectionId) {
      const err = new Error("Section ID is required for section/class scope");
      err.statusCode = 400;
      return next(err);
    }
    finalSectionId = sectionId;
  }

  if (scope === "class") {
    if (!classIds || !Array.isArray(classIds) || classIds.length === 0) {
      const err = new Error("At least one class ID is required for class scope");
      err.statusCode = 400;
      return next(err);
    }
    finalClassIds = classIds;
  }

  try {
    const newItem = await Item.create({
      name: name.trim(),
      price: Number(price),
      compulsory: compulsory || false,
      scope,
      sectionId: finalSectionId,
      classIds: finalClassIds,
    });

    const populatedItem = await Item.findById(newItem._id).populate("sectionId", "name").populate("classIds", "name");

    return res.status(201).json({
      success: true,
      message: "Item created successfully",
      data: transformItemForFrontend(populatedItem),
    });
  } catch (error) {
    console.error("Error creating item:", error);
    next(error);
  }
};

// ─── Get Item By ID ──────────────────────────────────────────────────────────

export const getItemById = async (req, res, next) => {
  const { id } = req.params;

  try {
    const item = await Item.findById(id).populate("sectionId", "name").populate("classIds", "name");

    if (!item) {
      const err = new Error("Item not found");
      err.statusCode = 404;
      return next(err);
    }

    return res.status(200).json({
      success: true,
      message: "Item fetched successfully",
      data: transformItemForFrontend(item),
    });
  } catch (error) {
    console.error("Error fetching item:", error);
    next(error);
  }
};

// ─── Update Item By ID ───────────────────────────────────────────────────────

export const updateItemById = async (req, res, next) => {
  const { id } = req.params;
  const { name, price, compulsory, scope, sectionId, classIds } = req.body;

  try {
    const currentItem = await Item.findById(id);
    if (!currentItem) {
      const err = new Error("Item not found");
      err.statusCode = 404;
      return next(err);
    }

    const updateData = {};

    // ── Basic Fields Validation ──────────────────────────────────────────────

    if (name !== undefined) {
      if (name.trim().length < 2) {
        const err = new Error("Item name must be at least 2 characters");
        err.statusCode = 400;
        return next(err);
      }
      updateData.name = name.trim();
    }

    if (price !== undefined) {
      if (isNaN(price) || price < 0) {
        const err = new Error("Price must be a valid positive number");
        err.statusCode = 400;
        return next(err);
      }
      updateData.price = Number(price);
    }

    if (compulsory !== undefined) {
      if (typeof compulsory !== "boolean") {
        const err = new Error("Compulsory must be a boolean");
        err.statusCode = 400;
        return next(err);
      }
      updateData.compulsory = compulsory;
    }

    // ── Scope-Dependent Validation ────────────────────

    if (scope !== undefined) {
      // Validate scope value
      if (!["global", "section", "class"].includes(scope)) {
        const err = new Error("Invalid scope");
        err.statusCode = 400;
        return next(err);
      }

      updateData.scope = scope;

      if (scope === "global") {
        updateData.sectionId = null;
        updateData.classIds = [];
      } else if (scope === "section") {
        if (!sectionId) {
          const err = new Error("Section ID required for section scope");
          err.statusCode = 400;
          return next(err);
        }
        updateData.sectionId = sectionId;
        updateData.classIds = [];
      } else if (scope === "class") {
        if (!sectionId) {
          const err = new Error("Section ID required for class scope");
          err.statusCode = 400;
          return next(err);
        }
        if (!classIds || !Array.isArray(classIds) || classIds.length === 0) {
          const err = new Error("At least one class ID required for class scope");
          err.statusCode = 400;
          return next(err);
        }
        updateData.sectionId = sectionId;
        updateData.classIds = classIds;
      }
    } else {
      // Scope not changing - validate based on CURRENT scope
      if (currentItem.scope === "section" || currentItem.scope === "class") {
        if (sectionId !== undefined) {
          updateData.sectionId = sectionId;
        }
      }
      if (currentItem.scope === "class" && classIds !== undefined) {
        if (!Array.isArray(classIds) || classIds.length === 0) {
          const err = new Error("At least one class ID required for class scope items");
          err.statusCode = 400;
          return next(err);
        }
        updateData.classIds = classIds;
      }
    }

    const updatedItem = await Item.findByIdAndUpdate(id, updateData, { returnDocument: "after" })
      .populate("sectionId", "name")
      .populate("classIds", "name");

    return res.status(200).json({
      success: true,
      message: "Item updated successfully",
      data: transformItemForFrontend(updatedItem),
    });
  } catch (error) {
    console.error("Error updating item:", error);
    next(error);
  }
};

// ─── Delete Item By ID ───────────────────────────────────────────────────────

export const deleteItemById = async (req, res, next) => {
  const { id } = req.params;

  try {
    const deletedItem = await Item.findByIdAndDelete(id);

    if (!deletedItem) {
      const err = new Error("Item not found");
      err.statusCode = 404;
      return next(err);
    }

    // Cleanup: Remove item from all roles that reference it
    await Role.updateMany({ itemIds: id }, { $pull: { itemIds: id } });

    // Cleanup: Delete roles that now have no items left
    await Role.deleteMany({ itemIds: { $size: 0 } });

    return res.status(200).json({
      success: true,
      message: "Item deleted successfully",
      data: transformItemForFrontend(deletedItem),
    });
  } catch (error) {
    console.error("Error deleting item:", error);
    next(error);
  }
};
