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
    // ── 1. ITEMS WITH NO ROLE (no_role) ───────────────────────────────
    const noRoleAgg = await ItemTransaction.aggregate([
      { $match: { status: "no_role" } },
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

    // ── 2. ITEMS WITH NO STAFF (no_staff) ─────────────────────────────
    const noStaffAgg = await ItemTransaction.aggregate([
      { $match: { status: "no_staff" } },
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

    // ── 3. SUMMARY STATS ──────────────────────────────────────────────
    const summary = {
      noRoleItemsCount: noRoleAgg.length,
      noStaffItemsCount: noStaffAgg.length,
      totalAffectedTransactions:
        noRoleAgg.reduce((sum, i) => sum + i.affectedTransactions, 0) + noStaffAgg.reduce((sum, i) => sum + i.affectedTransactions, 0),
    };

    return res.status(200).json({
      success: true,
      data: {
        summary,
        noRoleItems: noRoleAgg,
        noStaffItems: noStaffAgg,
      },
    });
  } catch (error) {
    console.error("Configuration Health Fetch Error:", error);
    if (!error.statusCode) error.statusCode = 500;
    next(error);
  }
};
