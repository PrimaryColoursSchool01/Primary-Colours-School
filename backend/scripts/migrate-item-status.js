// scripts/migrate-item-status.js
import "dotenv/config";
import mongoose from "mongoose";
import ItemTransaction from "../src/models/item-transaction.model.js";
import Role from "../src/models/role.model.js";
import User from "../src/models/user.model.js";

const migrateItemStatus = async () => {
  if (!process.env.MONGODB_URI) {
    console.error("❌ MONGODB_URI is not defined in your .env file");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);

  // Find all transactions that are still "unassigned"
  // ✅ Removed .populate("itemId") to avoid schema registration issues
  const unassignedTransactions = await ItemTransaction.find({ status: "unassigned" }).lean();

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
          // Actually has staff - was likely misclassified
          newStatus = "no_role"; // Fallback for safety
          reason = "Migrated: Item has roles with staff - review needed";
          noRoleCount++;
        } else {
          // Roles exist but no active staff
          newStatus = "no_staff";
          reason = `Migrated: Assigned role(s) have no active staff`;
          noStaffCount++;
        }
      }

      // ✅ FIXED UPDATE OPERATION:
      // We only $set the status, and $push a new history entry.
      await ItemTransaction.updateOne(
        { _id: tx._id },
        {
          $set: {
            status: newStatus,
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
      console.error(`❌ Error migrating transaction ${tx._id}:`, error);
      errorCount++;
    }
  }

  console.log(`
✅ Migration complete:
   • no_role: ${noRoleCount}
   • no_staff: ${noStaffCount}
   • errors: ${errorCount}
   • total processed: ${unassignedTransactions.length}
  `);

  await mongoose.disconnect();
  process.exit(0);
};

migrateItemStatus();
