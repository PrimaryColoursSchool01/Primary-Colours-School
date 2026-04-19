// scripts/migrate-item-status.js
import mongoose from "mongoose";
import ItemTransaction from "../models/item-transaction.model.js";
import Role from "../models/role.model.js";
import User from "../models/user.model.js";
import Item from "../models/items-fess.model.js";

const migrateItemStatus = async () => {
  await mongoose.connect(process.env.MONGODB_URI);

  // Find all transactions that are still "unassigned"
  const unassignedTransactions = await ItemTransaction.find({ status: "unassigned" }).populate("itemId", "name").lean();

  console.log(`🔍 Found ${unassignedTransactions.length} unassigned transactions to migrate`);

  let noRoleCount = 0;
  let noStaffCount = 0;
  let errorCount = 0;

  for (const tx of unassignedTransactions) {
    try {
      // 1. Find roles assigned to this item
      const roles = await Role.find({ itemIds: tx.itemId }).lean();

      let newStatus, reason;

      if (roles.length === 0) {
        // Case A: Item has no assigned role
        newStatus = "no_role";
        reason = "Migrated: Item has no assigned role";
        noRoleCount++;
      } else {
        // Case B: Item has roles - check if any have active staff
        const roleIds = roles.map((r) => r._id);
        const activeStaff = await User.findOne({
          roles: { $in: roleIds },
          userType: "staff",
          status: "active",
        }).lean();

        if (activeStaff) {
          // Actually has staff - should have been "pending", but was misclassified
          // Keep as "no_role" as safe fallback, admin can review
          newStatus = "no_role";
          reason = "Migrated: Item has roles with staff - review needed";
          noRoleCount++; // Conservative fallback
        } else {
          // Roles exist but no active staff
          newStatus = "no_staff";
          reason = `Migrated: Assigned role(s) have no active staff: ${roles.map((r) => r.name).join(", ")}`;
          noStaffCount++;
        }
      }

      // Update the transaction
      await ItemTransaction.updateOne(
        { _id: tx._id },
        {
          $set: {
            status: newStatus,
            "statusHistory.0.reason": reason,
          },
          $push: {
            statusHistory: {
              status: newStatus,
              changedBy: null, // System migration
              changedAt: new Date(),
              reason: reason,
            },
          },
        },
      );
    } catch (error) {
      console.error(`Error migrating transaction ${tx._id}:`, error);
      errorCount++;
    }
  }

  console.log(`
 Migration complete:
   • no_role: ${noRoleCount}
   • no_staff: ${noStaffCount}
   • errors: ${errorCount}
   • total processed: ${unassignedTransactions.length}
  `);

  await mongoose.disconnect();
};

migrateItemStatus();
