import Section from "../models/section.model.js";
export const getAllSections = async (req, res, next) => {
  try {
    const sections = await Section.find({}).sort({ name: 1 });
    return res.status(200).json({ message: "Sections fetched successfully", sections });
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
    return res
      .status(200)
      .json({ message: "Section updated successfully", section: updatedSection });
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
    const deletedSection = await Section.findByIdAndDelete(id);
    if (!deletedSection) {
      const err = new Error("Section not found");
      err.statusCode = 404;
      return next(err);
    }
    return res.status(200).json({ message: "Section deleted successfully" });
  } catch (error) {
    console.error("Error deleting section:", error);
    if (!error.statusCode) error.statusCode = 500;
    return next(error);
  }
};
