// controllers/user.controller.js
import bcrypt from "bcrypt";
import User from "../models/user.model.js";
import Role from "../models/role.model.js";
import ItemTransaction from "../models/item-transaction.model.js";
import { sendEmail } from "../utils/sendEmail.js";
import Item from "../models/items-fess.model.js";
import PaymentRecord from "../models/payment-record.model.js";
import Class from "../models/class.model.js";
import Section from "../models/section.model.js";

export const registerUser = async (req, res, next) => {
  const { fullName, email, password, userType, roleIds } = req.body;

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

  if (password.length < 6) {
    const err = new Error("Password must be at least 6 characters");
    err.statusCode = 400;
    return next(err);
  }

  const finalUserType = userType || "staff";

  if (!["admin", "staff"].includes(finalUserType)) {
    const err = new Error("User type must be 'admin' or 'staff'");
    err.statusCode = 400;
    return next(err);
  }

  let finalRoleIds = roleIds;
  if (!finalRoleIds) {
    const err = new Error("At least one role is required");
    err.statusCode = 400;
    return next(err);
  }
  if (!Array.isArray(finalRoleIds)) {
    finalRoleIds = [finalRoleIds];
  }

  if (finalRoleIds.length === 0) {
    const err = new Error("At least one role is required");
    err.statusCode = 400;
    return next(err);
  }

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      const err = new Error("Email already in use");
      err.statusCode = 409;
      return next(err);
    }

    const existingRoles = await Role.find({ _id: { $in: finalRoleIds } });
    if (existingRoles.length !== finalRoleIds.length) {
      const err = new Error("One or more roles not found");
      err.statusCode = 404;
      return next(err);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      fullName,
      email,
      password: hashedPassword,
      userType: finalUserType,
      roles: finalRoleIds,
      status: "active",
    });

    // AUTO-ASSIGN LOGIC (Fixed: Query Role collection for itemIds)
    if (finalUserType === "staff" && finalRoleIds.length > 0) {
      // FIX: Query Role collection to get itemIds (not Item collection)
      const roles = await Role.find({ _id: { $in: finalRoleIds } })
        .select("itemIds")
        .lean();
      const linkedItemIds = roles.flatMap((role) => role.itemIds || []);

      if (linkedItemIds.length > 0) {
        const allStaffWithRole = await User.find({
          roles: { $in: finalRoleIds },
          userType: "staff",
          status: "active",
        }).select("_id");

        if (allStaffWithRole.length > 0) {
          const allStaffIds = allStaffWithRole.map((s) => s._id);

          // FIX: Check both no_role AND no_staff
          await ItemTransaction.updateMany(
            {
              itemId: { $in: linkedItemIds },
              status: { $in: ["no_role", "no_staff"] },
            },
            {
              $set: {
                status: "pending",
                staffIds: allStaffIds,
              },
              $push: {
                statusHistory: {
                  status: "pending",
                  changedBy: req.user?.id || null,
                  changedAt: new Date(),
                  reason: "Auto-assigned: All staff with role (new user registered)",
                },
              },
            },
          );

          console.log(`🔄 Auto-assigned ${linkedItemIds.length} items to ${allStaffIds.length} staff members`);
        }
      }
    }

    // Send welcome email (non-blocking)
    try {
      await sendEmail({
        to: email,
        subject: "Welcome to School Management System",
        html: `
          <h2>Welcome, ${fullName}!</h2>
          <p>Your account has been created by the admin.</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Temporary Password:</strong> ${password}</p>
          <p>Please login and change your password immediately.</p>
          <p>Login URL: ${process.env.FRONTEND_URL}/login</p>
        `,
      });
    } catch (emailError) {
      console.error("Failed to send welcome email:", emailError);
    }

    const populatedUser = await User.findById(newUser._id).populate("roles", "name scope");

    return res.status(201).json({
      message: "User registered successfully",
      user: {
        _id: populatedUser._id,
        fullName: populatedUser.fullName,
        email: populatedUser.email,
        userType: populatedUser.userType,
        roles: populatedUser.roles,
        status: populatedUser.status,
      },
    });
  } catch (error) {
    console.error("Error registering user:", error);
    if (!error.statusCode) error.statusCode = 500;
    return next(error);
  }
};

export const getAllUsers = async (req, res, next) => {
  try {
    const { userType, status, search, page = 1, limit = 10 } = req.query;

    const filter = {};

    if (userType && ["admin", "staff"].includes(userType)) {
      filter.userType = userType;
    }

    if (status && ["active", "suspended"].includes(status)) {
      filter.status = status;
    }

    if (search) {
      filter.$or = [{ fullName: { $regex: search, $options: "i" } }, { email: { $regex: search, $options: "i" } }];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const users = await User.find(filter)
      .populate("roles", "name scope")
      .select("-password -refreshToken -tokenVersion -resetPasswordToken -resetPasswordExpires")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(filter);

    return res.status(200).json({
      message: "Users fetched successfully",
      count: users.length,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      users,
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    if (!error.statusCode) error.statusCode = 500;
    return next(error);
  }
};

export const getUserById = async (req, res, next) => {
  const { id } = req.params;

  if (!id) {
    const err = new Error("User ID is required");
    err.statusCode = 400;
    return next(err);
  }

  try {
    const user = await User.findById(id)
      .populate("roles", "name scope sectionId classIds itemIds")
      .select("-password -refreshToken -tokenVersion -resetPasswordToken -resetPasswordExpires");

    if (!user) {
      const err = new Error("User not found");
      err.statusCode = 404;
      return next(err);
    }

    return res.status(200).json({
      message: "User fetched successfully",
      user: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        userType: user.userType,
        roles: user.roles,
        status: user.status,
        suspendedAt: user.suspendedAt,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    if (!error.statusCode) error.statusCode = 500;
    return next(error);
  }
};

export const updateUserById = async (req, res, next) => {
  const { id } = req.params;
  const { fullName, email, roleIds, status } = req.body;

  if (!id) {
    const err = new Error("User ID is required");
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

    if (fullName !== undefined) {
      if (!fullName.trim()) {
        const err = new Error("Full name cannot be empty");
        err.statusCode = 400;
        return next(err);
      }
      user.fullName = fullName.trim();
    }

    if (email !== undefined) {
      if (!email.trim()) {
        const err = new Error("Email cannot be empty");
        err.statusCode = 400;
        return next(err);
      }

      const existingUser = await User.findOne({ email: email.trim(), _id: { $ne: id } });
      if (existingUser) {
        const err = new Error("Email already in use");
        err.statusCode = 409;
        return next(err);
      }

      const oldEmail = user.email;
      user.email = email.trim();

      try {
        await sendEmail({
          to: email.trim(),
          subject: "Your Email Was Updated",
          html: `
            <p>Hello ${fullName},</p>
            <p>Your email address has been updated from <strong>${oldEmail}</strong> to <strong>${email.trim()}</strong>.</p>
            <p>If you didn't request this change, please contact your administrator.</p>
          `,
        });
      } catch (emailError) {
        console.error("Failed to send email update notification:", emailError);
      }
    }

    if (roleIds !== undefined) {
      let finalRoleIds = roleIds;
      if (!Array.isArray(finalRoleIds)) {
        finalRoleIds = [finalRoleIds];
      }

      if (finalRoleIds.length === 0) {
        const err = new Error("At least one role is required");
        err.statusCode = 400;
        return next(err);
      }

      const existingRoles = await Role.find({ _id: { $in: finalRoleIds } });
      if (existingRoles.length !== finalRoleIds.length) {
        const err = new Error("One or more roles not found");
        err.statusCode = 404;
        return next(err);
      }

      const oldRoleIds = user.roles.map((r) => r.toString());
      const addedRoleIds = finalRoleIds.filter((rid) => !oldRoleIds.includes(rid));

      // FIXED: Include current user in staff query since their roles aren't saved yet
      if (addedRoleIds.length > 0) {
        const roles = await Role.find({ _id: { $in: addedRoleIds } })
          .select("itemIds")
          .lean();
        const linkedItemIds = roles.flatMap((role) => role.itemIds || []);

        if (linkedItemIds.length > 0) {
          const existingStaffWithRole = await User.find({
            roles: { $in: addedRoleIds },
            userType: "staff",
            status: "active",
          }).select("_id");

          // FIX: Merge existing staff + current user (not yet persisted)
          const staffIdMap = new Map(existingStaffWithRole.map((s) => [s._id.toString(), s._id]));
          if (user.userType === "staff" && user.status === "active") {
            staffIdMap.set(user._id.toString(), user._id);
          }
          const allStaffIds = [...staffIdMap.values()];

          if (allStaffIds.length > 0) {
            await ItemTransaction.updateMany(
              {
                itemId: { $in: linkedItemIds },
                status: { $in: ["no_role", "no_staff"] },
              },
              {
                $set: {
                  status: "pending",
                  staffIds: allStaffIds,
                },
                $push: {
                  statusHistory: {
                    status: "pending",
                    changedBy: req.user.id,
                    changedAt: new Date(),
                    reason: "Auto-assigned: All staff with new role",
                  },
                },
              },
            );

            console.log(`🔄 Auto-assigned ${linkedItemIds.length} items to ${allStaffIds.length} staff members with matching roles`);
          }
        }
      }

      // Existing logic: Remove user from items no longer in their roles
      const newRoleItemIds = await Role.find({ _id: { $in: finalRoleIds } }).distinct("itemIds");
      const userItemTransactions = await ItemTransaction.find({
        staffIds: user._id,
        status: { $in: ["pending", "no_staff", "no_role"] },
      });

      const itemTransactionsToRemoveUser = userItemTransactions.filter(
        (transaction) => !newRoleItemIds.map((i) => i.toString()).includes(transaction.itemId.toString()),
      );

      if (itemTransactionsToRemoveUser.length > 0) {
        const transactionIds = itemTransactionsToRemoveUser.map((t) => t._id);
        await ItemTransaction.updateMany({ _id: { $in: transactionIds } }, { $pull: { staffIds: user._id } });

        await ItemTransaction.updateMany(
          { _id: { $in: transactionIds }, staffIds: { $size: 0 } },
          {
            $set: { status: "no_staff" },
            $push: {
              statusHistory: {
                status: "no_staff",
                changedBy: req.user.id,
                changedAt: new Date(),
                reason: "No active staff in assigned role(s)",
              },
            },
          },
        );
      }

      user.roles = finalRoleIds;
    }

    if (status !== undefined) {
      if (!["active", "suspended"].includes(status)) {
        const err = new Error("Invalid status");
        err.statusCode = 400;
        return next(err);
      }
      user.status = status;

      if (status === "suspended" && !user.suspendedAt) {
        user.suspendedAt = new Date();
      }

      if (status === "active" && user.suspendedAt) {
        user.suspendedAt = null;
      }
    }

    await user.save();

    const updatedUser = await User.findById(user._id).populate("roles", "name scope");

    return res.status(200).json({
      message: "User updated successfully",
      user: {
        _id: updatedUser._id,
        fullName: updatedUser.fullName,
        email: updatedUser.email,
        userType: updatedUser.userType,
        roles: updatedUser.roles,
        status: updatedUser.status,
      },
    });
  } catch (error) {
    console.error("Error updating user:", error);
    if (!error.statusCode) error.statusCode = 500;
    return next(error);
  }
};

export const suspendUser = async (req, res, next) => {
  const { id } = req.params;

  if (!id) {
    const err = new Error("User ID is required");
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

    if (user.status === "suspended") {
      const err = new Error("User is already suspended");
      err.statusCode = 400;
      return next(err);
    }

    user.status = "suspended";
    user.suspendedAt = new Date();
    await user.save();

    return res.status(200).json({
      message: "User suspended successfully",
      user: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        status: user.status,
        suspendedAt: user.suspendedAt,
      },
    });
  } catch (error) {
    console.error("Error suspending user:", error);
    if (!error.statusCode) error.statusCode = 500;
    return next(error);
  }
};

export const unsuspendUser = async (req, res, next) => {
  const { id } = req.params;

  if (!id) {
    const err = new Error("User ID is required");
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

    if (user.status !== "suspended") {
      const err = new Error("User is not suspended");
      err.statusCode = 400;
      return next(err);
    }

    // AUTO-ASSIGN LOGIC (Fixed: Query Role collection for itemIds)
    if (user.roles?.length > 0) {
      // FIX: Query Role collection to get itemIds
      const roles = await Role.find({ _id: { $in: user.roles } })
        .select("itemIds")
        .lean();
      const linkedItemIds = roles.flatMap((role) => role.itemIds || []);

      if (linkedItemIds.length > 0) {
        const allStaffWithRole = await User.find({
          roles: { $in: user.roles },
          userType: "staff",
          status: "active",
        }).select("_id");

        if (allStaffWithRole.length > 0) {
          const allStaffIds = allStaffWithRole.map((s) => s._id);

          await ItemTransaction.updateMany(
            {
              itemId: { $in: linkedItemIds },
              status: { $in: ["no_role", "no_staff"] },
            },
            {
              $set: {
                status: "pending",
                staffIds: allStaffIds,
              },
              $push: {
                statusHistory: {
                  status: "pending",
                  changedBy: req.user.id,
                  changedAt: new Date(),
                  reason: "Auto-assigned: All staff with role (user unsuspended)",
                },
              },
            },
          );

          console.log(`🔄 Auto-assigned items to ${allStaffIds.length} staff members`);
        }
      }
    }

    user.status = "active";
    user.suspendedAt = null;
    await user.save();

    return res.status(200).json({
      message: "User unsuspended successfully",
      user: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        status: user.status,
      },
    });
  } catch (error) {
    console.error("Error unsuspending user:", error);
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
    const user = await User.findById(id);
    if (!user) {
      const err = new Error("User not found");
      err.statusCode = 404;
      return next(err);
    }

    if (user.userType === "admin") {
      const adminCount = await User.countDocuments({ userType: "admin", _id: { $ne: id } });
      if (adminCount === 0) {
        const err = new Error("Cannot delete the last admin user");
        err.statusCode = 400;
        return next(err);
      }
    }

    const deletedUser = await User.findByIdAndDelete(id);

    // Soft cleanup: remove user from all transactions
    await ItemTransaction.updateMany({ staffIds: id }, { $pull: { staffIds: id } });

    //  FIX: Add statusHistory when setting no_staff
    await ItemTransaction.updateMany(
      { staffIds: { $size: 0 }, status: { $in: ["pending", "no_staff", "no_role"] } },
      {
        $set: { status: "no_staff" },
        $push: {
          statusHistory: {
            status: "no_staff",
            changedBy: null,
            changedAt: new Date(),
            reason: `Staff deleted — no remaining staff assigned (user: ${deletedUser.fullName})`,
          },
        },
      },
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

export const resetPassword = async (req, res, next) => {
  const { id } = req.params;
  const { newPassword } = req.body;

  if (!id) {
    const err = new Error("User ID is required");
    err.statusCode = 400;
    return next(err);
  }

  if (!newPassword) {
    const err = new Error("New password is required");
    err.statusCode = 400;
    return next(err);
  }

  if (newPassword.length < 6) {
    const err = new Error("Password must be at least 6 characters");
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

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.tokenVersion += 1;
    await user.save();

    try {
      await sendEmail({
        to: user.email,
        subject: "Your Password Was Reset",
        html: `
          <p>Hello ${user.fullName},</p>
          <p>Your password has been reset by an administrator.</p>
          <p><strong>New Temporary Password:</strong> ${newPassword}</p>
          <p>Please login and change your password immediately.</p>
          <p>Login URL: ${process.env.FRONTEND_URL}/login</p>
        `,
      });
      console.log(`Password reset notification sent to ${user.email}`);
    } catch (emailError) {
      console.error("Failed to send password reset notification:", emailError);
    }

    return res.status(200).json({
      message: "Password reset successfully",
    });
  } catch (error) {
    console.error("Error resetting password:", error);
    if (!error.statusCode) error.statusCode = 500;
    return next(error);
  }
};
