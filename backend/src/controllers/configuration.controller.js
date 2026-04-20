import mongoose from "mongoose";
import ItemTransaction from "../models/item-transaction.model.js";
import Item from "../models/items-fess.model.js";
import Role from "../models/role.model.js";
import User from "../models/user.model.js";

/**
 * GET /api/admin/configuration-health
 * Returns items causing stuck transactions, grouped by root cause.
 * Designed for admin awareness only. Fixing happens in Items/Roles settings.
 */
export const getConfigurationHealth = async (req, res, next) => {
  try {
    // ── 1. FIND ITEMS WITH NO ROLE (Check current Item config) ─
    const itemsWithNoRoles = await Item.aggregate([
      {
        $lookup: {
          from: "roles",
          let: { itemId: "$_id" },
          pipeline: [{ $match: { $expr: { $in: ["$$itemId", "$itemIds"] } } }],
          as: "assignedRoles",
        },
      },
      { $match: { assignedRoles: { $size: 0 } } }, // Items with ZERO roles
      { $project: { _id: 1, name: 1 } },
    ]);

    const itemIdsWithNoRoles = itemsWithNoRoles.map((i) => i._id);

    // Find stuck transactions for these items
    const noRoleAgg = await ItemTransaction.aggregate([
      {
        $match: {
          itemId: { $in: itemIdsWithNoRoles },
          status: { $in: ["no_role", "no_staff", "pending"] },
        },
      },
      { $group: { _id: "$itemId", affectedTransactions: { $sum: 1 } } },
      {
        $lookup: {
          from: "items",
          localField: "_id",
          foreignField: "_id",
          as: "item",
        },
      },
      { $unwind: "$item" },
      {
        $project: {
          _id: 0,
          itemId: "$_id",
          itemName: "$item.name",
          affectedTransactions: 1,
        },
      },
      { $sort: { affectedTransactions: -1 } },
    ]);

    // ── 2. FIND ITEMS WITH NO ACTIVE STAFF (Check current Role config) ─
    const itemsWithRoles = await Item.aggregate([
      {
        $lookup: {
          from: "roles",
          let: { itemId: "$_id" },
          pipeline: [{ $match: { $expr: { $in: ["$$itemId", "$itemIds"] } } }],
          as: "assignedRoles",
        },
      },
      { $match: { assignedRoles: { $gt: [] } } }, // Has at least one role
      { $project: { _id: 1, name: 1, assignedRoles: { $map: { input: "$assignedRoles", as: "role", in: "$$role._id" } } } },
    ]);

    const noStaffItems = [];
    for (const item of itemsWithRoles) {
      // Check if ANY of the item's roles have active staff
      const activeStaffCount = await User.countDocuments({
        roles: { $in: item.assignedRoles },
        userType: "staff",
        status: "active",
      });

      if (activeStaffCount === 0) {
        // This item has roles but no active staff
        const stuckTransactions = await ItemTransaction.countDocuments({
          itemId: item._id,
          status: { $in: ["no_staff", "pending"] },
        });

        if (stuckTransactions > 0) {
          noStaffItems.push({
            itemId: item._id,
            itemName: item.name,
            affectedTransactions: stuckTransactions,
          });
        }
      }
    }

    noStaffItems.sort((a, b) => b.affectedTransactions - a.affectedTransactions);

    // ── 3. SUMMARY STATS ──────────────────────────────────────────────
    const summary = {
      noRoleItemsCount: noRoleAgg.length,
      noStaffItemsCount: noStaffItems.length,
      totalAffectedTransactions:
        noRoleAgg.reduce((sum, i) => sum + i.affectedTransactions, 0) + noStaffItems.reduce((sum, i) => sum + i.affectedTransactions, 0),
    };

    return res.status(200).json({
      success: true,
      data: {
        summary,
        noRoleItems: noRoleAgg,
        noStaffItems: noStaffItems,
      },
    });
  } catch (error) {
    console.error("Configuration Health Fetch Error:", error);
    if (!error.statusCode) error.statusCode = 500;
    next(error);
  }
};
