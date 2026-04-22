import mongoose from "mongoose";
import ItemTransaction from "../models/item-transaction.model.js";
import Item from "../models/items-fess.model.js";
import Role from "../models/role.model.js";
import User from "../models/user.model.js";

/**
 * GET /api/admin/configuration-health
 * Returns items with configuration issues (no role or no active staff),
 * including those without any transactions yet.
 */
export const getConfigurationHealth = async (req, res, next) => {
  try {
    // ── 1. ALL ITEMS WITH NO ROLE (with transaction counts) ─
    const noRoleItems = await Item.aggregate([
      // Find roles for each item
      {
        $lookup: {
          from: "roles",
          let: { itemId: "$_id" },
          pipeline: [{ $match: { $expr: { $in: ["$$itemId", "$itemIds"] } } }],
          as: "assignedRoles",
        },
      },
      // Keep only items with zero roles
      { $match: { assignedRoles: { $size: 0 } } },
      // Count stuck transactions for these items (can be 0)
      {
        $lookup: {
          from: "itemtransactions",
          let: { itemId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$itemId", "$$itemId"] },
                status: { $in: ["no_role", "no_staff", "pending"] },
              },
            },
            { $count: "count" },
          ],
          as: "stuckTx",
        },
      },
      {
        $project: {
          _id: 0,
          itemId: "$_id",
          itemName: "$name",
          affectedTransactions: {
            $ifNull: [{ $arrayElemAt: ["$stuckTx.count", 0] }, 0],
          },
        },
      },
      { $sort: { affectedTransactions: -1, itemName: 1 } },
    ]);

    // ── 2. ALL ITEMS WITH ROLES BUT NO ACTIVE STAFF ─
    // First get items that have at least one role
    const itemsWithRoles = await Item.aggregate([
      {
        $lookup: {
          from: "roles",
          let: { itemId: "$_id" },
          pipeline: [{ $match: { $expr: { $in: ["$$itemId", "$itemIds"] } } }],
          as: "assignedRoles",
        },
      },
      { $match: { assignedRoles: { $ne: [] } } },
      {
        $project: {
          _id: 1,
          name: 1,
          assignedRoleIds: {
            $map: {
              input: "$assignedRoles",
              as: "role",
              in: "$$role._id",
            },
          },
        },
      },
    ]);

    const noStaffItems = [];

    for (const item of itemsWithRoles) {
      // Check if ANY assigned role has at least one active staff user
      const activeStaffCount = await User.countDocuments({
        roles: { $in: item.assignedRoleIds },
        userType: "staff",
        status: "active",
      });

      if (activeStaffCount === 0) {
        // Count stuck transactions (could be 0)
        const stuckTransactions = await ItemTransaction.countDocuments({
          itemId: item._id,
          status: { $in: ["no_role", "no_staff", "pending"] },
        });

        // Always include this item, even if stuckTransactions = 0
        noStaffItems.push({
          itemId: item._id,
          itemName: item.name,
          affectedTransactions: stuckTransactions,
        });
      }
    }

    noStaffItems.sort((a, b) => {
      if (b.affectedTransactions !== a.affectedTransactions) {
        return b.affectedTransactions - a.affectedTransactions;
      }
      return a.itemName.localeCompare(b.itemName);
    });

    // ── 3. SUMMARY STATS ─
    const summary = {
      noRoleItemsCount: noRoleItems.length,
      noStaffItemsCount: noStaffItems.length,
      totalAffectedTransactions:
        noRoleItems.reduce((sum, i) => sum + i.affectedTransactions, 0) + noStaffItems.reduce((sum, i) => sum + i.affectedTransactions, 0),
    };

    return res.status(200).json({
      success: true,
      data: {
        summary,
        noRoleItems: noRoleItems,
        noStaffItems: noStaffItems,
      },
    });
  } catch (error) {
    console.error("Configuration Health Fetch Error:", error);
    if (!error.statusCode) error.statusCode = 500;
    next(error);
  }
};
