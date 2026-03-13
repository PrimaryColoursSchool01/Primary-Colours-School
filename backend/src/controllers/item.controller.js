import Item from "../models/items-fess.model.js";
export const getAllItems = async (req, res, next) => {
  try {
    const items = await Item.find({}).populate("sectionId").populate("classIds");
    return res.status(200).json(items);
  } catch (error) {
    console.error("Error fetching items:", error);
    if (!error.statusCode) error.statusCode = 500;
    next(error);
  }
};

export const createItem = async (req, res, next) => {
  const { name, price, compulsory, selectionType, sectionId, classIds } = req.body;
  if (!name || !price || !selectionType) {
    const err = new Error("Name, price, and selection type are required");
    err.statusCode = 400;
    return next(err);
  }

  if (isNaN(price) || price < 0) {
    const err = new Error("Price must be a valid positive number");
    err.statusCode = 400;
    return next(err);
  }

  let scope;
  let finalSectionId;
  let finalClassIds = [];

  // Determine scope based on admin selection
  switch (selectionType) {
    case "all-sections":
      scope = "global";
      break;
    case "section-all-classes":
      scope = "section";
      if (!sectionId) {
        const err = new Error("Section ID is required for specific all classes");
        err.statusCode = 400;
        return next(err);
      }
      finalSectionId = sectionId;
      break;
    case "section-specific-classes":
      scope = "class";
      if (!sectionId) {
        const err = new Error("Section ID is required for section specific classes");
        err.statusCode = 400;
        return next(err);
      }
      if (!classIds || !Array.isArray(classIds) || classIds.length === 0) {
        const err = new Error("At least one class ID is required for section specific classes");
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

  try {
    const newItem = await Item.create({
      name,
      price,
      compulsory: compulsory || false,
      scope,
      sectionId: finalSectionId,
      classIds: finalClassIds,
    });
    return res.status(201).json({ message: "Item created successfully", item: newItem });
  } catch (error) {
    console.error("Error creating item:", error);
    if (!error.statusCode) error.statusCode = 500;
    next(error);
  }
};

export const getItemById = async (req, res, next) => {
  const { id } = req.params;
  if (!id) {
    const err = new Error("Item ID is required");
    err.statusCode = 400;
    return next(err);
  }
  try {
    const item = await Item.findById(id).populate("sectionId").populate("classIds");
    if (!item) {
      const err = new Error("Item not found");
      err.statusCode = 404;
      return next(err);
    }
    return res.status(200).json({ message: "Item fetched successfully", item });
  } catch (error) {
    console.error("Error fetching item:", error);
    if (!error.statusCode) error.statusCode = 500;
    return next(error);
  }
};

export const updateItemById = async (req, res, next) => {
  const { id } = req.params;
  const { name, price, compulsory, selectionType, sectionId, classIds } = req.body;

  if (!id) {
    const err = new Error("Item ID is required");
    err.statusCode = 400;
    return next(err);
  }

  try {
    // Fetch the current item to determine what properties are being updated
    const currentItem = await Item.findById(id);
    if (!currentItem) {
      const err = new Error("Item not found");
      err.statusCode = 404;
      return next(err);
    }

    // Build the update object dynamically with only provided fields
    const updateData = {};

    // Validate and add basic fields if provided
    if (name !== undefined) {
      updateData.name = name;
    }

    if (price !== undefined) {
      if (isNaN(price) || price < 0) {
        const err = new Error("Price must be a valid positive number");
        err.statusCode = 400;
        return next(err);
      }
      updateData.price = price;
    }

    if (compulsory !== undefined) {
      updateData.compulsory = compulsory;
    }

    // Validate scope-dependent fields only when selectionType is provided or changed
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
      // If selection type is not being changed, validate based on current scope
      if (currentItem.scope === "section" || currentItem.scope === "class") {
        if (sectionId !== undefined) {
          updateData.sectionId = sectionId;
        }
      }
      if (currentItem.scope === "class" && classIds !== undefined) {
        if (!Array.isArray(classIds) || classIds.length === 0) {
          const err = new Error("At least one class ID is required for class scope items");
          err.statusCode = 400;
          return next(err);
        }
        updateData.classIds = classIds;
      }
    }

    const updatedItem = await Item.findByIdAndUpdate(id, updateData, { new: true })
      .populate("sectionId")
      .populate("classIds");

    return res.status(200).json({ message: "Item updated successfully", item: updatedItem });
  } catch (error) {
    console.error("Error updating item:", error);
    if (!error.statusCode) error.statusCode = 500;
    return next(error);
  }
};

export const deleteItemById = async (req, res, next) => {
  const { id } = req.params;
  if (!id) {
    const err = new Error("Item ID is required");
    err.statusCode = 400;
    return next(err);
  }

  try {
    const deletedItem = await Item.findByIdAndDelete(id);
    if (!deletedItem) {
      const err = new Error("Item not found");
      err.statusCode = 404;
      return next(err);
    }
    return res.status(200).json({ message: "Item deleted successfully", item: deletedItem });
  } catch (error) {
    console.error("Error deleting item:", error);
    const err = new Error("Internal server error");
    err.statusCode = 500;
    return next(err);
  }
};
