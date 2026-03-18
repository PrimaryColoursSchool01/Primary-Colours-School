import bcrypt from "bcrypt";
import User from "../models/user.model.js";
import Role from "../models/role.model.js";
import ItemTransaction from "../models/item-transaction.model.js";

export const registerUser = async (req, res, next) => {
  const { fullName, email, password, roleId } = req.body;

  if (!fullName) {
    const err = new Error("Full name is required");
    err.statusCode = 400;
    return next(err);
  }

  if (!email) {
    const err = new Error("Email is required");
    err.statusCode = 400;
    return next(err);
  }

  if (!password) {
    const err = new Error("Password is required");
    err.statusCode = 400;
    return next(err);
  }

  if (!roleId) {
    const err = new Error("Role is required");
    err.statusCode = 400;
    return next(err);
  }

  try {
    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      const err = new Error("Email already in use");
      err.statusCode = 409;
      return next(err);
    }

    // Validate role exists
    const existingRole = await Role.findById(roleId);
    if (!existingRole) {
      const err = new Error("Role not found");
      err.statusCode = 404;
      return next(err);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      fullName,
      email,
      password: hashedPassword,
      userType: "staff",
      role: roleId,
    });

    return res.status(201).json({
      message: "User registered successfully",
      user: {
        _id: newUser._id,
        fullName: newUser.fullName,
        email: newUser.email,
        userType: newUser.userType,
        role: newUser.role,
      },
    });
  } catch (error) {
    console.error("Error registering user:", error);
    if (!error.statusCode) error.statusCode = 500;
    return next(error);
  }
};
export const updateUserById = async (req, res, next) => {
  const { id } = req.params;
  const { roleId } = req.body;

  if (!id) {
    const err = new Error("User ID is required");
    err.statusCode = 400;
    return next(err);
  }

  if (!roleId) {
    const err = new Error("Role is required");
    err.statusCode = 400;
    return next(err);
  }

  try {
    const user = await User.findById(id);
    if (!user) {
      const err = new Error("User not found");
      err.statusCode = 404;
      return next(err);
    }

    const newRole = await Role.findById(roleId);
    if (!newRole) {
      const err = new Error("Role not found");
      err.statusCode = 404;
      return next(err);
    }

    // Find all pending item transactions this user is assigned to
    const userItemTransactions = await ItemTransaction.find({
      staffIds: id,
      status: "pending",
    });

    // Find item transactions where the item is no longer in the new role
    const itemTransactionsToRemoveUser = userItemTransactions.filter(
      (transaction) =>
        !newRole.itemIds.map((i) => i.toString()).includes(transaction.itemId.toString()),
    );

    if (itemTransactionsToRemoveUser.length > 0) {
      const transactionIds = itemTransactionsToRemoveUser.map((t) => t._id);

      // Pull user from those item transactions
      await ItemTransaction.updateMany(
        { _id: { $in: transactionIds } },
        { $pull: { staffIds: id } },
      );

      // Mark item transactions with no staff left as unassigned
      await ItemTransaction.updateMany(
        { _id: { $in: transactionIds }, staffIds: { $size: 0 } },
        { $set: { status: "unassigned" } },
      );
    }

    // Update the user role
    user.role = roleId;
    await user.save();

    return res.status(200).json({
      message: "User role updated successfully",
      user: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        userType: user.userType,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Error updating user:", error);
    if (!error.statusCode) error.statusCode = 500;
    return next(error);
  }
};

export const deleteUserById = async (req, res, next) => {
  const { id } = req.params;

  if (!id) {
    const err = new Error("User ID is required");
    err.statusCode = 400;
    return next(err);
  }

  try {
    const deletedUser = await User.findOneAndDelete({ _id: id, userType: "staff" });
    if (!deletedUser) {
      const err = new Error("User not found");
      err.statusCode = 404;
      return next(err);
    }

    // Pull deleted user from all item transactions
    await ItemTransaction.updateMany({ staffIds: id }, { $pull: { staffIds: id } });

    // Mark item transactions with no staff left as unassigned
    await ItemTransaction.updateMany(
      { staffIds: { $size: 0 }, status: "pending" },
      { $set: { status: "unassigned" } },
    );

    return res.status(200).json({
      message: "User deleted successfully",
      user: {
        _id: deletedUser._id,
        fullName: deletedUser.fullName,
        email: deletedUser.email,
      },
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    if (!error.statusCode) error.statusCode = 500;
    return next(error);
  }
};

export const getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find({ userType: "staff" })
      .populate("role")
      .select("-password -refreshToken -tokenVersion -resetPasswordToken -resetPasswordExpires")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      message: "Users fetched successfully",
      count: users.length,
      users,
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    if (!error.statusCode) error.statusCode = 500;
    return next(error);
  }
};
