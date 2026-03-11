import Class from "../models/class.model.js";
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
  const { name, sectionId } = req.body;
  if (!id) {
    const err = new Error("Class ID is required");
    err.statusCode = 400;
    return next(err);
  }
  if (!name || !sectionId) {
    const err = new Error("Class name and section ID are required");
    err.statusCode = 400;
    return next(err);
  }
  try {
    const updatedClass = await Class.findByIdAndUpdate(
      id,
      { name, sectionId },
      { new: true },
    ).populate("sectionId", "name");
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
    const deletedClass = await Class.findByIdAndDelete(id);
    if (!deletedClass) {
      const err = new Error("Class not found");
      err.statusCode = 404;
      return next(err);
    }
    return res.status(200).json({ message: "Class deleted successfully", class: deletedClass });
  } catch (error) {
    console.error("Error deleting class:", error);
    return next(error);
  }
};
